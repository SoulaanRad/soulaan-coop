export {
  generateLoginCode,
  isEmailConfigured,
  sendLoginCode,
  sendNewOrderAlertEmail,
  sendOrderConfirmationEmail,
  sendOrderEmails,
  sendWaitlistWelcomeEmail,
} from "../lib/email.js";

export type { OrderEmailData, OrderEmailItem } from "../lib/email.js";
