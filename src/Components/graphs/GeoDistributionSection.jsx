"use client";
import React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const GeoDistributionSection = ({
  isMobile,
  uniqueYears,
  selectedGeoYear,
  selectedGeoPeriod,
  availableQuarters,
  onChangeYear,
  onChangePeriod,
  selectedGeoData,
  colors,
}) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#ffffff", marginBottom: "12px", textAlign: "center", fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" }, letterSpacing: "0.5px" }}>
        Geografisk fördelning av intäkter
      </Typography>

      {uniqueYears.length > 0 ? (
        <>
          <Tabs value={selectedGeoYear} onChange={onChangeYear} textColor="inherit" TabIndicatorProps={{ style: { backgroundColor: "#ff5722" } }} sx={{ color: "#b0b0b0", marginBottom: "10px", "& .MuiTab-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "6px 8px", sm: "12px 16px" } } }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
            {uniqueYears.map((year) => (
              <Tab key={year} label={year} value={year.toString()} />
            ))}
          </Tabs>

          <Tabs value={selectedGeoPeriod} onChange={onChangePeriod} textColor="inherit" TabIndicatorProps={{ style: { backgroundColor: "#00e676" } }} sx={{ color: "#b0b0b0", marginBottom: "12px", "& .MuiTab-root": { fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" }, padding: { xs: "6px 8px", sm: "12px 16px" } } }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
            {availableQuarters.includes("Q1") && <Tab label="Q1" value="Q1" />}
            {availableQuarters.includes("Q2") && <Tab label="Q2" value="Q2" />}
            {availableQuarters.includes("Q3") && <Tab label="Q3" value="Q3" />}
            {availableQuarters.includes("Q4") && <Tab label="Q4" value="Q4" />}
            <Tab label="Helår" value="Helår" />
          </Tabs>

          <Typography variant="h6" color="#ffffff" sx={{ marginBottom: "10px", textAlign: "center", fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.8rem" } }}>
            Intäkter per region ({selectedGeoYear} {selectedGeoPeriod})
          </Typography>

          {selectedGeoData.length > 0 && selectedGeoData.some((item) => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie data={selectedGeoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 80 : 100} fill="#8884d8" label={isMobile ? false : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} labelLine={isMobile ? false : true}>
                  {selectedGeoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toLocaleString("sv-SE")} MEUR`} contentStyle={{ backgroundColor: "#2e2e2e", color: "#fff", border: "none", borderRadius: "5px" }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Typography variant="body2" color="#b0b0b0" sx={{ textAlign: "center", marginBottom: "12px", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
              Ingen data tillgänglig för detta kvartal.
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" color="#b0b0b0" sx={{ textAlign: "center", marginBottom: "12px", fontSize: { xs: "0.85rem", sm: "0.95rem" } }}>
          Ingen geografisk data tillgänglig.
        </Typography>
      )}
    </Box>
  );
};

export default GeoDistributionSection;

