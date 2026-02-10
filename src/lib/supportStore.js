import { getJson, setJson } from "@/lib/authStore";

const normEmail = (email) => String(email || "").trim().toLowerCase();

export const getSupportTicketKey = (id) => `support:ticket:${id}`;
export const getSupportTicketsIndexKey = () => "support:tickets";
export const getSupportUserTicketsKey = (email) => `support:user:${normEmail(email)}:tickets`;

const capList = (arr, max) => (Array.isArray(arr) ? arr.slice(0, max) : []);

export const createSupportTicket = async ({ email, firstName = "", lastName = "", subject, message }) => {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = new Date().toISOString();
  const ticket = {
    id,
    email: normEmail(email),
    firstName: String(firstName || "").trim(),
    lastName: String(lastName || "").trim(),
    subject: String(subject || "").trim(),
    message: String(message || "").trim(),
    status: "open", // open | answered | closed
    adminReply: null, // { message, repliedAt, repliedBy }
    createdAt: now,
    updatedAt: now,
  };

  await setJson(getSupportTicketKey(id), ticket);

  const indexKey = getSupportTicketsIndexKey();
  const userKey = getSupportUserTicketsKey(ticket.email);
  const [index, userIndex] = await Promise.all([getJson(indexKey), getJson(userKey)]);
  const nextIndex = capList([id, ...(Array.isArray(index) ? index : []).filter((x) => x !== id)], 500);
  const nextUserIndex = capList([id, ...(Array.isArray(userIndex) ? userIndex : []).filter((x) => x !== id)], 200);
  await Promise.all([setJson(indexKey, nextIndex), setJson(userKey, nextUserIndex)]);

  return ticket;
};

export const getSupportTicket = async (id) => {
  if (!id) return null;
  return await getJson(getSupportTicketKey(id));
};

export const updateSupportTicket = async (id, patch) => {
  const existing = await getSupportTicket(id);
  if (!existing) return null;
  const next = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  await setJson(getSupportTicketKey(id), next);
  return next;
};

export const listSupportTicketsByIds = async (ids, limit = 50) => {
  const list = Array.isArray(ids) ? ids.slice(0, limit) : [];
  const tickets = await Promise.all(list.map((id) => getSupportTicket(id)));
  return tickets.filter(Boolean);
};

