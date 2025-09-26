// GradientFill.jsx
export default function GradientFill({ id, color = "#00e676", from = 0.25, to = 0 }) {
    return (
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={from} />
          <stop offset="100%" stopColor={color} stopOpacity={to} />
        </linearGradient>
      </defs>
    );
  }