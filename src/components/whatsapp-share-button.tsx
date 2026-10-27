import { Button, type ButtonProps } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/whatsapp-icon";
import { whatsappShareUrl } from "@/lib/urls";

/**
 * Opens WhatsApp with the customer's number and a pre-written message
 * (PRD §6.6). Nothing is sent automatically — the owner presses send.
 */
export function WhatsappShareButton({
  phone,
  message,
  label,
  size = "lg",
  variant = "whatsapp",
  className,
}: {
  phone: string;
  message: string;
  label: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={whatsappShareUrl(phone, message)} target="_blank" rel="noopener noreferrer">
        <WhatsappIcon className="h-5 w-5" />
        {label}
      </a>
    </Button>
  );
}
