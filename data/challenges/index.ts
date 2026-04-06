import { code as frontendCode, category as frontend } from "./frontend";
import { code as backendCode, category as backend } from "./backend";
import { code as securityCode, category as security } from "./security";
import { code as dsaCode, category as dsa } from "./dsa";
import { code as oopCode, category as oop } from "./oop";

export const codeTemplates: { [category: string]: string } = {
  [frontend]: frontendCode,
  [backend]: backendCode,
  [security]: securityCode,
  [dsa]: dsaCode,
  [oop]: oopCode,
};