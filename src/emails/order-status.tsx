import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** Customer-facing "your order status changed" email. */
export function OrderStatusEmail(props: {
  storeName: string;
  orderNumber: string;
  name: string;
  statusLabel: string;
  trackingNumber: string | null;
  note: string | null;
  strings: {
    preview: string;
    greeting: string;
    statusNow: string;
    trackingLabel: string;
    footer: string;
  };
}) {
  const { strings: s } = props;
  return (
    <Html>
      <Head />
      <Preview>{s.preview}</Preview>
      <Body style={{ backgroundColor: "#F5F6F8", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 16, maxWidth: 520, padding: 32 }}>
          <Heading as="h2" style={{ color: "#1B2A4A", fontSize: 20, margin: "0 0 16px" }}>
            {props.storeName}
          </Heading>
          <Text style={{ color: "#222", fontSize: 15, margin: "0 0 8px" }}>
            {s.greeting} {props.name},
          </Text>
          <Text style={{ color: "#222", fontSize: 15, margin: "0 0 16px" }}>
            {s.statusNow} — <strong>{props.orderNumber}</strong>:
          </Text>
          <Section style={{ backgroundColor: "#F5F6F8", borderRadius: 12, padding: "14px 20px", textAlign: "center" as const }}>
            <Text style={{ color: "#1B2A4A", fontSize: 18, fontWeight: 700, margin: 0 }}>{props.statusLabel}</Text>
          </Section>
          {props.trackingNumber ? (
            <Text style={{ color: "#222", fontSize: 14, margin: "16px 0 0" }}>
              {s.trackingLabel}: <strong>{props.trackingNumber}</strong>
            </Text>
          ) : null}
          {props.note ? (
            <Text style={{ color: "#555", fontSize: 14, margin: "12px 0 0" }}>{props.note}</Text>
          ) : null}
          <Text style={{ color: "#8A8F98", fontSize: 12, margin: "24px 0 0" }}>{s.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
