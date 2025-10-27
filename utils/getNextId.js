import Counter from "../models/Counter.js";

export const getNextConversationId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "conversation_id" }, // fixed ID key
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Start from 100 if it's first time
  if (counter.seq < 100) {
    counter.seq = 100;
    await counter.save();
  }

  return counter.seq;
};
