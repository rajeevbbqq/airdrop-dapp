import React from "react";
import StarsOutlinedIcon from "@mui/icons-material/StarsOutlined";
import { Box } from "@mui/system";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Divider from "@mui/material/Divider";

type Step = {
  title: string;
  description: string;
};
type Props = {
  title: string;
  steps: Step[];
  blogLink?: string;
};

function Airdroprules({ title, steps, blogLink }: Props, ref) {
  if (!steps || !(steps.length > 0)) {
    return null;
  }
  return (
    <Box sx={{ bgcolor: "bgHighlight.main", m: 5, py: 3 }} ref={ref}>
      <Typography align="center" color="bgtext.main" variant="h3">
        {title}
      </Typography>
      <Box sx={{ m: 4 }}>
        <Grid container spacing={1} mt={4} justifyContent="center">
          {steps.map((step, index) => (
            <Grid item xs={9} sm={10} md={8} key={step.title}>
              <Box sx={{ display: "flex", p: 0.7, pr: 0 }}>
                <Box color="success" sx={{ mr: 1 }}>
                  <StarsOutlinedIcon color="primary" />
                </Box>
                <Typography color="bgtext.main" variant="h4">
                  {step.title}
                </Typography>
              </Box>
              <Typography color="textAdvanced.primary">{step.description}</Typography>
              {index !== steps.length - 1 ? <Divider variant="inset" component="li" /> : null}
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <Box textAlign="center">
            {blogLink ? (
              <Button
                variant="outlined"
                color="info"
                endIcon={<OpenInNewIcon />}
                href={blogLink}
                target="_blank"
                rel="noreferrer noopener"
              >
                Visit SingularityNet
              </Button>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default React.forwardRef(Airdroprules);
