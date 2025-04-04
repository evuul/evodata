import React from "react";
import { Box, Grid } from "@mui/material";
import Sidebar from "./Sidebar";
import DashboardBox from "./DashboardBox";

const Dashboard = () => {
  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Dashboard-innehåll */}
      <Box sx={{ flexGrow: 1, padding: "20px" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <DashboardBox title="Live Spelare">Här kommer en graf.</DashboardBox>
          </Grid>
          <Grid item xs={12} md={6}>
            <DashboardBox title="Ekonomisk Data">Här kommer ekonomiska siffror.</DashboardBox>
          </Grid>
          <Grid item xs={12}>
            <DashboardBox title="Senaste Nyheter">Här kan du ha en uppdateringsfeed.</DashboardBox>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;