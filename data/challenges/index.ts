import { code as frontendCode, category as frontend } from "./frontend.ts";
import { code as backendCode, category as backend } from "./backend.ts";
import { code as securityCode, category as security } from "./security.ts";
import { code as dsaCode, category as dsa } from "./dsa.ts";
import { code as oopCode, category as oop } from "./oop.ts";

export const codeTemplates: { [category: string]: string } = {
  [frontend]: frontendCode,
  [backend]: backendCode,
  [security]: securityCode,
  [dsa]: dsaCode,
  [oop]: oopCode,
};
