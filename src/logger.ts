import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
export const logger = pino({
  transport: isTest
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
});
