# EXHIBIT A - COMMERCIAL TERMS SCHEDULE

**Partner:** `{{counterparty.display_name}}`  
**Controlling Language:** `{{agreement.controlling_language}}`

## 1. Partner Identification

| Field | Value |
|---|---|
| Partner Name | `{{counterparty.display_name}}` |
{{#if counterparty.primary_tax_id_value}}| {{counterparty.primary_tax_id_label}} | {{counterparty.primary_tax_id_value}} |
{{/if}}
| Territory | `{{commercial.territory}}` |
| Exclusivity | `{{commercial.territory_exclusivity}}` |

## 2. Licensed Products

`{{commercial.products}}`

## 3. Fees

| Fee | Currency | Amount |
|---|---:|---:|
| Licensing Fee | {{commercial.fees.currency}} | {{commercial.fees.licensing_fee_amount}} |

## 4. Commission Basis

Commissions are calculated on net amounts effectively received by the Company after refunds, chargebacks, payment processor fees, gateway fees, taxes, discounts, credits, token costs, operating costs, and other expenses expressly identified by the Company.

| Commission Field | Value |
|---|---:|
| Net Profit Participation | {{pct commercial.commission.net_profit_percentage}} |
| Licensing Fee Commission | {{pct commercial.commission.licensing_fee_percentage}} |
| Residual Participation | {{pct commercial.commission.residual_percentage}} |
| Calculation Basis | {{commercial.commission.calculation_basis}} |

## 5. Specific Conditions

`None.`
