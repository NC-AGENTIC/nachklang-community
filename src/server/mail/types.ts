export type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}
