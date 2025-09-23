import app, {$} from "./app";
import './routes';

$.initialize();

const PORT = parseInt(process.env.PORT!);
if (isNaN(PORT)) throw new Error("PORT is not a number");

app.listen({ port: PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(app.printRoutes());
  console.log(`Server is running @ http://localhost:${PORT}`);

});