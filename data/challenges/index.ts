import {
  code as frontendCode,
  fixedCode as fixedFrontendCode,
  category as frontend,
} from "./frontend.ts";
import {
  code as backendCode,
  fixedCode as fixedBackendCode,
  category as backend,
} from "./backend.ts";
import {
  code as securityCode,
  fixedCode as fixedSecurityCode,
  category as security,
} from "./security.ts";
import {
  code as dsaCode,
  fixedCode as fixedDsaCode,
  category as dsa,
} from "./dsa.ts";
import {
  code as oopCode,
  fixedCode as fixedOopCode,
  category as oop,
} from "./oop.ts";

export const codeTemplates: { [category: string]: string } = {
  [frontend]: frontendCode,
  [backend]: backendCode,
  [security]: securityCode,
  [dsa]: dsaCode,
  [oop]: oopCode,
};

export const fixedCodeTemplates: { [category: string]: string } = {
  [frontend]: fixedFrontendCode,
  [backend]: fixedBackendCode,
  [security]: fixedSecurityCode,
  [dsa]: fixedDsaCode,
  [oop]: fixedOopCode,
};
