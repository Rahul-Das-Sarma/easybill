import { setupServer } from "msw/node";

import { authOnboardingHandlers } from "./handlers/auth-onboarding";
import { customersHandlers } from "./handlers/customers";
import { gstBillingHandlers } from "./handlers/gst-billing";
import { invoiceMutationHandlers } from "./handlers/invoice-mutation";
import { invoicePdfHandlers } from "./handlers/invoice-pdf";
import { invoicesHandlers } from "./handlers/invoices";
import { uiComponentsHandlers } from "./handlers/ui-components";

export const server = setupServer(
  ...gstBillingHandlers,
  ...authOnboardingHandlers,
  ...customersHandlers,
  ...invoiceMutationHandlers,
  ...invoicePdfHandlers,
  ...invoicesHandlers,
  ...uiComponentsHandlers,
);

