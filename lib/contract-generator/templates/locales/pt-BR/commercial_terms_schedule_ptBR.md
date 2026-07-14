# ANEXO A - CONDIÇÕES COMERCIAIS (TRADUÇÃO DE REFERÊNCIA)

**Parceiro:** `{{counterparty.display_name}}`  
**Idioma Prevalecente:** `{{agreement.controlling_language}}`

## 1. Identificação do Parceiro

| Campo | Valor |
|---|---|
| Nome do Parceiro | `{{counterparty.display_name}}` |
{{#if counterparty.primary_tax_id_value}}| {{counterparty.primary_tax_id_label}} | {{counterparty.primary_tax_id_value}} |
{{/if}}
| Território | `{{commercial.territory}}` |
| Exclusividade | `{{commercial.territory_exclusivity}}` |

## 2. Produtos Licenciados

`{{commercial.products}}`

## 3. Taxas

| Taxa | Moeda | Valor |
|---|---:|---:|
| Taxa de Licenciamento | {{commercial.fees.currency}} | {{commercial.fees.licensing_fee_amount}} |

## 4. Base de Comissionamento

As comissões são calculadas sobre valores líquidos efetivamente recebidos pela Empresa após reembolsos, chargebacks, taxas de processadores de pagamento, taxas de gateway, tributos, descontos, créditos, custos de tokens, custos operacionais e outras despesas expressamente identificadas pela Empresa.

| Campo de Comissão | Valor |
|---|---:|
| Participação no Lucro Líquido | {{pct commercial.commission.net_profit_percentage}} |
| Comissão sobre Taxa de Licenciamento | {{pct commercial.commission.licensing_fee_percentage}} |
| Participação Residual | {{pct commercial.commission.residual_percentage}} |
| Base de Cálculo | {{commercial.commission.calculation_basis}} |

## 5. Condições Específicas

`Nenhuma.`
