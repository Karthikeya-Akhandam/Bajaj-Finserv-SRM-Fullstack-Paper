import { app, validateIdentity } from "./app.js";
const port = Number(process.env.PORT || 3000);
validateIdentity();

app.listen(port, () => {
  console.log(`backend running on port ${port}`);
});
