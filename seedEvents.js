const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Event = require("./modules/Event"); 

dotenv.config({ path: "./config/config.env" });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedEvents = async () => {
  await Event.deleteMany(); 

  await Event.insertMany([
    {
      title: "Walkathon for Earth 🌎",
      description: "A 5km walk to raise awareness for Earth Day.",
      image: "https://betterworld.org/_astro/walkathon-fundraiser_Z1xrxmQ.jpg",
      address: "Central Park, NY",
      date: "2025-04-25",
      time: "09:00 AM",
    },
    {
      title: "Green Marathon 🌿",
      description: "Run with a mission to plant trees.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQKas71DoVdVtx2BM948quBxuprQz0MVW5hYtUwGyIwAADMA1bUucskwK0Ifr0gNJpsJg&usqp=CAU",
      address: "City Sports Complex",
      date: "2025-05-01",
      time: "07:00 AM",
    },
    {
      title: "Forest Protection Rally 🌲",
      description: "Join hands to protect our forests.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVWusGR8g22HrDqrrcD-VL0SXcMY7nrvLkEw&s",
      address: "Eco Grounds, Valley Road",
      date: "2025-05-15",
      time: "08:00 AM",
    },
  ]);

  console.log("✅ Default events added!");
  process.exit();
};

seedEvents().catch((err) => {
  console.error("Error seeding events:", err);
  process.exit(1);
});
