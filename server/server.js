const express = require("express");
const cors = require("cors");
const cookieparser = require("cookie-parser");
const path = require("path");
const server = express();
const dotenv = require("dotenv");

//load environment
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabase = require("./supabase/supabase");
const { loadcurrentuser } = require("./middleware");
const { normalizeresponse } = require("./utils/response");

const rsvproutes = require("./routes/rsvp").router;
const adminappointmentroutes = require("./routes/appointmentadmin").router;
const customerappointmentroutes = require("./routes/appointmentcustomer").router;
const adminadoptiondriveroutes = require("./routes/adoptiondriveadmin").router;
const customeradoptiondriveroutes = require("./routes/adoptiondrivecustomer").router;
const guestadoptiondriveroutes = require("./routes/adoptiondriveguest").router;
const authroutes = require("./routes/auth").router;
const adminroutes = require("./routes/useradmin").router;
const customerroutes = require("./routes/usercustomer").router;
const bookadminroutes = require("./routes/bookadmin").router;
const bookcustomerroutes = require("./routes/bookcustomer").router;
const openlibraryadminroutes = require("./routes/openlibraryadmin").router;
const watchlistroutes = require("./routes/watchlistcustomer").router;
const customeradoptionapplicationroutes = require("./routes/adoptionapplicationcustomer").router;
const adminadoptionapplicationroutes = require("./routes/adoptionapplicationadmin").router;

server.use(normalizeresponse);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cookieparser());

//allow vue client to send authentication cookies to this api request
server.use(cors({
    origin: process.env.clienturl,
    credentials: true, //allow > send authentication information with cross-origin requests
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  })
);

server.use("/", require("./routes/databaseadmin").router);
server.use(require("./utils/validation").validaterequest);
server.use(loadcurrentuser);

server.get("/", (req, res) => res.json({name: "adopt-a-book-server", status: "ok"}));

server.use("/admin", adminroutes);
server.use("/admin/drives", adminadoptiondriveroutes);
server.use("/admin/books", bookadminroutes);
server.use("/admin/open-library", openlibraryadminroutes);
server.use("/admin/applications", adminadoptionapplicationroutes);
server.use("/customer/drives", customeradoptiondriveroutes);
server.use("/books", bookcustomerroutes);
server.use("/watchlist", watchlistroutes);
server.use("/applications", customeradoptionapplicationroutes);
server.use("/customer", customerroutes);
server.use("/", authroutes);
server.use("/drives", guestadoptiondriveroutes);
server.use("/", rsvproutes);
server.use("/appointments", customerappointmentroutes);
server.use("/admin/appointments", adminappointmentroutes);

server.use((req, res) => res.status(404).json({ error: "route not found" }));
server.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.status === 400 || error.status === 413 ? error.status : 500;
  return res.status(status).json({ error: status === 400 ? "invalid request body" : status === 413 ? "request body is too large" : "internal server error" });
});

async function connectdb() {
  const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) { throw new Error(`supabase connection failed > ${error.message}`); }
  console.log("supabase connected successfully");
}

function startserver() {
  const port = Number(process.env.port);
  server.listen(port, () => {console.log(`server running at ${process.env.serverurl}/`);});
}

connectdb().then(startserver).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
