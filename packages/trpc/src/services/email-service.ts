export {
  generateLoginCode,
  isEmailConfigured,
  sendLoginCode,
  sendNewOrderAlertEmail,
  sendOrderConfirmationEmail,
  sendOrderEmails,
} from "../lib/email.js";

export type { OrderEmailData, OrderEmailItem } from "../lib/email.js";
