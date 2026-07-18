import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";

export type OrderEmailProps = {
  storeName: string;
  orderNumber: string;
  name: string;
  lines: { name: string; quantity: number; total: number }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  codFee: number;
  grandTotal: number;
  currency: string;
  strings: {
    preview: string;
    greeting: string;
    thanks: string;
    subtotal: string;
    discount: string;
    shipping: string;
    codFee: string;
    total: string;
    footer: string;
  };
};

const money = (n: number, c: string) => `${n.toLocaleString("en-US")} ${c}`;

export function OrderConfirmationEmail(props: OrderEmailProps) {
  const { strings: s, currency } = props;
  return (
    <Html>
      <Head />
      <Preview>{s.preview}</Preview>
      <Body style={{ backgroundColor: "#F7F7F5", fontFamily: "Arial, sans-serif", color: "#1A1A1A" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, margin: "24px auto", padding: 32, maxWidth: 560 }}>
          <Heading as="h1" style={{ color: "#16294E", fontSize: 24, margin: 0 }}>
            {props.storeName}
          </Heading>
          <Text style={{ fontSize: 16 }}>
            {s.greeting} {props.name},
          </Text>
          <Text style={{ fontSize: 16 }}>
            {s.thanks} <b>{props.orderNumber}</b>
          </Text>
          <Hr />
          <Section>
            {props.lines.map((line, i) => (
              <Row key={i} style={{ marginBottom: 6 }}>
                <Column style={{ fontSize: 14 }}>
                  {line.quantity} × {line.name}
                </Column>
                <Column style={{ fontSize: 14, textAlign: "right" as const, fontWeight: 700 }}>
                  {money(line.total, currency)}
                </Column>
              </Row>
            ))}
          </Section>
          <Hr />
          <Section>
            <Row>
              <Column style={{ fontSize: 14 }}>{s.subtotal}</Column>
              <Column style={{ fontSize: 14, textAlign: "right" as const }}>{money(props.subtotal, currency)}</Column>
            </Row>
            {props.discountTotal > 0 ? (
              <Row>
                <Column style={{ fontSize: 14, color: "#3E5233" }}>{s.discount}</Column>
                <Column style={{ fontSize: 14, textAlign: "right" as const, color: "#3E5233" }}>
                  −{money(props.discountTotal, currency)}
                </Column>
              </Row>
            ) : null}
            <Row>
              <Column style={{ fontSize: 14 }}>{s.shipping}</Column>
              <Column style={{ fontSize: 14, textAlign: "right" as const }}>{money(props.shippingTotal, currency)}</Column>
            </Row>
            {props.codFee > 0 ? (
              <Row>
                <Column style={{ fontSize: 14 }}>{s.codFee}</Column>
                <Column style={{ fontSize: 14, textAlign: "right" as const }}>{money(props.codFee, currency)}</Column>
              </Row>
            ) : null}
            <Row>
              <Column style={{ fontSize: 16, fontWeight: 800 }}>{s.total}</Column>
              <Column style={{ fontSize: 16, textAlign: "right" as const, fontWeight: 800, color: "#16294E" }}>
                {money(props.grandTotal, currency)}
              </Column>
            </Row>
          </Section>
          <Hr />
          <Text style={{ fontSize: 12, color: "#6B7280" }}>{s.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
