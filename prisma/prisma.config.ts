import "dotenv/config";

export default {
  migrate: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
};
