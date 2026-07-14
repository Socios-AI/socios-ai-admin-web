# CONTRATO DE LICENÇA DE SOFTWARE, PARCERIA COMERCIAL E CONFIDENCIALIDADE (TRADUÇÃO DE REFERÊNCIA)

**Documento (ID):** {{agreement.document_id}}  
**Data Efetiva:** {{agreement.effective_date}}  
**Versão do Template:** {{agreement.version}}  
**Idioma Prevalecente:** {{agreement.controlling_language}}  
{{#if agreement.reference_language}}**Idioma de Referência:** {{agreement.reference_language}}  {{/if}}

Este Contrato de Licença de Software, Parceria Comercial e Confidencialidade (o **"Contrato"**) é celebrado na data do aceite eletrônico pela Parte Receptora, por e entre:

## 1. Partes

### 1.1 Parte Reveladora / Empresa

**{{socios.legal_name}}**, uma {{socios.entity_type}}, EIN nº **{{socios.ein}}**, com endereço registrado em **{{socios.registered_address}}**, representada por seu representante autorizado **{{socios.authorized_representative}}** ou pelo signatário autorizado identificado abaixo (a **"Empresa"** ou **"Parte Reveladora"**).

### 1.2 Parte Receptora / Parceiro

{{#if counterparty.is_legal_entity}}
**{{counterparty.legal_name}}**{{#if counterparty.primary_tax_id_value}}, {{counterparty.primary_tax_id_label}} nº {{counterparty.primary_tax_id_value}}{{/if}}{{#if counterparty.address_full}}, com endereço registrado em {{counterparty.address_full}}{{/if}}, representada por {{counterparty.signatory.full_name}}, {{counterparty.signatory.title}}, e-mail {{counterparty.email}} (a **"Parte Receptora"** ou **"Parceiro"**).
{{/if}}

{{#unless counterparty.is_legal_entity}}
**{{counterparty.display_name}}**{{#if counterparty.primary_tax_id_value}}, {{counterparty.primary_tax_id_label}} nº {{counterparty.primary_tax_id_value}}{{/if}}{{#if counterparty.address_full}}, residente e domiciliado(a) em {{counterparty.address_full}}{{/if}}, e-mail {{counterparty.email}} (a **"Parte Receptora"** ou **"Parceiro"**).
{{/unless}}

A Empresa e a Parte Receptora são individualmente referidas como **"Parte"** e, em conjunto, como as **"Partes"**.

## 2. Objeto

O objeto deste Contrato é regular: (a) o licenciamento não exclusivo e a comercialização autorizada do software, soluções de IA, automações, workflows, agentes e serviços relacionados sob a marca **Sócios AI**; (b) a parceria comercial entre as Partes; (c) a troca e a proteção de informações confidenciais; (d) a proteção de propriedade intelectual, clientes, leads, dados e relacionamentos comerciais; e (e) as condições comerciais estabelecidas no Anexo de Condições Comerciais aplicável.

## 3. Ordem de Prevalência

Em caso de conflito entre documentos, aplica-se a seguinte ordem: (1) cláusulas obrigatórias de proteção de dados exigidas pela lei aplicável, exclusivamente quanto à sua matéria; (2) qualquer aditivo específico de país, exclusivamente quanto à sua jurisdição e matéria; (3) o Order Form ou Anexo de Condições Comerciais aplicável, exclusivamente quanto a preços, pagamento, território e condições de comissão; (4) este Contrato; (5) o Aditivo de Tratamento de Dados; (6) políticas incorporadas, incluindo Política de Uso Aceitável, Código de Conduta do Parceiro, Política de Privacidade, Diretrizes de Marca e Termos de IA; e (7) qualquer tradução em idioma local, que é tradução de referência apenas, salvo disposição expressa em contrário.

## 4. Licença de Software

Sujeito a este Contrato, a Empresa concede à Parte Receptora uma licença limitada, não exclusiva, revogável, intransferível e não sublicenciável para divulgar e comercializar os produtos Sócios AI autorizados listados no Anexo de Condições Comerciais, exclusivamente dentro do território, segmento de mercado e escopo autorizados nele definidos.

A Parte Receptora atua como contratada independente. Nada neste Contrato cria sociedade, joint venture, franquia, agência, vínculo empregatício, poderes de representação, dever fiduciário, relação societária ou exclusividade, salvo se um aditivo específico de país aplicável dispuser expressamente em contrário.

## 5. Restrições da Licença

A Parte Receptora não poderá: (a) sublicenciar, ceder, transferir, arrendar, emprestar, revender fora do escopo aprovado ou de qualquer outra forma disponibilizar o software a terceiros; (b) permitir o uso por afiliadas, subsidiárias, controladoras, entidades relacionadas ou integrantes do mesmo grupo econômico sem aprovação prévia por escrito; (c) compartilhar credenciais, chaves de API, logins, tokens, permissões ou links de acesso; (d) exceder o número contratado de usuários, unidades de negócio, clientes, territórios ou operações; (e) realizar scraping, extração de modelos, extração de prompts, benchmarking para divulgação pública, engenharia reversa, descompilação, testes de segurança ou testes de carga sem autorização por escrito; (f) usar o software para treinar ou aprimorar modelos ou sistemas concorrentes; ou (g) usar o software para atividades ilegais, enganosas, abusivas, infratoras, de alto risco ou reguladas sem as aprovações exigidas.

## 6. Propriedade Intelectual

Todo software, código-fonte, código-objeto, modelos, algoritmos, workflows, prompts, automações, agentes, interfaces, bancos de dados, documentação, métodos, marcas, logotipos, segredos comerciais, lógica de precificação, playbooks de vendas, materiais de treinamento, estratégias comerciais e demais direitos de propriedade intelectual da Empresa permanecem propriedade única e exclusiva da Empresa ou de seus licenciantes.

Qualquer melhoria, customização, adaptação, integração, automação, prompt, agente de IA, workflow, material de treinamento, recurso, funcionalidade, método comercial ou desenvolvimento complementar criado, sugerido, solicitado, implementado ou derivado durante o relacionamento e relacionado à plataforma Sócios AI pertencerá exclusivamente à Empresa. Na máxima extensão permitida em lei, a Parte Receptora cede à Empresa todos os direitos, títulos e interesses sobre tais desenvolvimentos, em caráter mundial, perpétuo, irrevogável e isento de royalties, e assinará quaisquer documentos adicionais razoavelmente necessários para aperfeiçoar tal titularidade.

## 7. Confidencialidade e Segredos Comerciais

Informações Confidenciais incluem todas as informações não públicas divulgadas ou disponibilizadas pela Empresa, incluindo software, código, algoritmos, dados, segredos comerciais, preços, clientes, leads, parceiros, roadmap de produto, documentação técnica, prompts, automações, workflows, informações financeiras, estratégia, marketing e modelos comerciais. As Informações Confidenciais deverão ser protegidas com, no mínimo, cuidado razoável e utilizadas somente para os fins deste Contrato.

A Parte Receptora não poderá divulgar, copiar, reproduzir, explorar, vender, comercializar ou usar Informações Confidenciais para qualquer finalidade alheia a este Contrato. Essas obrigações sobrevivem à rescisão enquanto a informação permanecer confidencial ou qualificar-se como segredo comercial nos termos da lei aplicável.

## 8. Condições Comerciais

Condições comerciais, financeiras, operacionais, de comissão, precificação, pagamento, metas, auditoria e participação em receita são definidas exclusivamente no Anexo de Condições Comerciais. Nenhuma comissão, taxa, participação em receita ou participação econômica será devida salvo se expressamente prevista no anexo aplicável e efetivamente recebida pela Empresa.

Todas as comissões são calculadas sobre valores líquidos efetivamente recebidos pela Empresa após dedução de reembolsos, chargebacks, tributos, taxas de processadores de pagamento, taxas de gateway, descontos, créditos, custos operacionais, custos de tokens, custos de implementação e outras despesas diretamente relacionadas, salvo se o Anexo de Condições Comerciais dispuser expressamente em contrário.

## 9. Conduta do Parceiro; Marketing; Proibição de Promessas de Renda

A Parte Receptora deverá cumprir o Código de Conduta do Parceiro, as Diretrizes de Marca, as leis de marketing aplicáveis, leis anti-spam, leis de proteção ao consumidor, leis anticorrupção, leis de privacidade e todos os requisitos de mensagens aprovadas. A Parte Receptora não poderá fazer declarações enganosas, garantias de renda, promessas de receita passiva, alegações de investimento, alegações irreais de ganhos ou representações não aprovadas por escrito pela Empresa.

A Parte Receptora não poderá apresentar a oportunidade como investimento financeiro, esquema de pirâmide, sistema de renda passiva, retorno garantido, oportunidade de emprego, franquia, agência ou arranjo de representação, salvo se expressamente autorizado em documento específico de país.

## 10. Proteção de Clientes e Leads

Clientes, leads, prospects, parceiros, fornecedores, provedores de tecnologia e oportunidades de negócio apresentados pela Empresa ou desenvolvidos com uso de informações, marca, sistema, tecnologia ou estrutura comercial da Empresa são relacionamentos comerciais protegidos da Empresa. A Parte Receptora não poderá desviar, migrar, aliciar, induzir ou interferir em tais relacionamentos em benefício próprio ou de terceiros.

Clientes originados de forma independente pela Parte Receptora podem ser mantidos, desde que não tenham sido adquiridos, influenciados ou desenvolvidos com uso de Informações Confidenciais, plataforma, marca, leads, estrutura de vendas ou estratégias proprietárias da Empresa.

## 11. Não Circunvenção; Não Solicitação Limitada

Durante a vigência deste Contrato e por doze (12) meses após seu término, a Parte Receptora não poderá contornar, circunvencionar, excluir ou reduzir a participação da Empresa em qualquer transação, oportunidade, cliente, fornecedor, parceiro ou arranjo comercial apresentado ou viabilizado pela Empresa.

Qualquer restrição de não contratação ou não solicitação será limitada a empregados, contratados, desenvolvedores, consultores ou parceiros estratégicos que tenham estado materialmente envolvidos no relacionamento ou tido acesso a Informações Confidenciais da Empresa. Solicitações gerais, anúncios públicos de vagas, buscas de recrutadores não direcionadas a tais pessoas ou contatos iniciados de forma independente pelo profissional ficam excluídos, salvo se proibidos por norma obrigatória aplicável.

## 12. Não Concorrência; Liberdade Profissional

A Parte Receptora pode atuar nos mercados de tecnologia, inteligência artificial, marketing, software, consultoria e soluções comerciais, desde que tais atividades não envolvam concorrência direta com a Sócios AI mediante uso indevido de Informações Confidenciais, workflows proprietários, lógica protegida, segredos comerciais, arquitetura de software, relacionamentos com clientes ou propriedade intelectual da Empresa. Qualquer restrição será interpretada de forma restritiva e somente na extensão permitida pela lei aplicável.

## 13. Proteção de Dados

As Partes deverão cumprir todas as leis de proteção de dados e privacidade aplicáveis. Quando o relacionamento envolver tratamento de dados pessoais, o Aditivo de Tratamento de Dados aplicável é obrigatório e integra este Contrato. O DPA deverá identificar os papéis das Partes, categorias de dados, finalidades de tratamento, medidas de segurança, suboperadores, prazos de retenção, regras de notificação de incidentes, suporte a direitos dos titulares e mecanismos de transferência internacional.

A Empresa poderá suspender o tratamento ou o acesso quando necessário para proteger segurança, confidencialidade, conformidade legal, titulares de dados, clientes, a plataforma ou os negócios da Empresa.

## 14. Termos Específicos de IA

A Parte Receptora reconhece que outputs de IA podem ser imprecisos, incompletos, enviesados, desatualizados ou inadequados para determinado uso. Os outputs devem ser revisados por humanos qualificados antes de uso em decisões de negócio, jurídicas, financeiras, médicas, tributárias, trabalhistas, reguladas ou de alto impacto. O software não substitui aconselhamento profissional, salvo se um contrato escrito específico dispuser expressamente em contrário.

A Parte Receptora é responsável pelos inputs, instruções, prompts, dados carregados, decisões tomadas e ações realizadas com base nos outputs. A Parte Receptora não poderá declarar que os outputs são garantidos, livres de erros, juridicamente conformes ou adequados a qualquer finalidade.

## 15. Compliance Internacional

A Parte Receptora deverá cumprir todas as leis aplicáveis, incluindo leis anticorrupção, antissuborno, de sanções, de controle de exportação, de prevenção à lavagem de dinheiro, de proteção ao consumidor, de publicidade, tributárias, de privacidade e de tecnologia. A Parte Receptora não poderá usar o software ou a parceria para transacionar com pessoas sancionadas, territórios restritos, usos finais proibidos ou atividades ilícitas.

## 16. Tributos; Notas Fiscais; Retenções

Cada Parte é responsável por seus próprios tributos, declarações, livros, licenças, registros e obrigações regulatórias. Pagamentos de comissão ou participação em receita podem ser condicionados a nota fiscal/invoice válida, formulários fiscais, instruções de pagamento e documentação de compliance exigida pela Empresa. A Empresa poderá reter, compensar, suspender ou postergar pagamentos quando exigido por lei, chargeback, reembolso, fraude, revisão de compliance, documentação fiscal faltante ou disputa não resolvida.

## 17. Limitação de Responsabilidade

Na máxima extensão permitida pela lei aplicável, nenhuma das Partes será responsável por danos indiretos, incidentais, especiais, punitivos, exemplares ou consequenciais, incluindo lucros cessantes, perda de receita, de oportunidade, de dados, de goodwill, interrupção de negócios ou dano reputacional. Exceto por fraude, dolo, violações de confidencialidade, violações de propriedade intelectual, violações de proteção de dados, obrigações de pagamento, obrigações de indenização e uso indevido da plataforma ou da marca, a responsabilidade agregada não excederá os valores efetivamente pagos sob o Anexo de Condições Comerciais aplicável nos doze meses anteriores ao evento que der origem à reclamação.

## 18. Indenização

A Parte Receptora deverá indenizar, defender e manter indene a Empresa e suas afiliadas, administradores, sócios, diretores, executivos, contratados e representantes de reclamações, perdas, danos, responsabilidades, custos, penalidades e despesas decorrentes de: (a) promessas, declarações, materiais de venda ou marketing não autorizados; (b) violação de lei; (c) uso indevido do software, marca, dados ou Informações Confidenciais; (d) atos ou omissões de representantes, agentes, empregados, contratados ou subparceiros da Parte Receptora; (e) reclamações tributárias, trabalhistas, de consumidor, de franquia, de agência ou de representação causadas pela conduta da Parte Receptora; ou (f) violação deste Contrato.

## 19. Prazo e Rescisão

Este Contrato inicia na Data Efetiva e permanece em vigor até ser rescindido conforme seus termos. Qualquer Parte pode rescindir sem justa causa mediante aviso prévio por escrito de trinta (30) dias. A Empresa pode rescindir imediatamente ou suspender o acesso por justa causa, incluindo violação de confidencialidade, violação de PI, concorrência não autorizada, engenharia reversa, conduta ilícita, inadimplência, abuso de chargeback, dano reputacional, risco à segurança de dados, violação das obrigações de proteção de clientes ou violação de regras de marketing/compliance.

Na rescisão, a Parte Receptora deverá cessar imediatamente a comercialização, parar de usar as marcas e materiais da Empresa, devolver ou destruir Informações Confidenciais, deixar de se apresentar como associada à Empresa e cooperar para preservar a continuidade de clientes/usuários vinculados à Empresa.

## 20. Lei Aplicável e Arbitragem Internacional

Este Contrato será regido pelas leis do Estado da Flórida, Estados Unidos da América, sem aplicação de regras de conflito de leis que exijam a aplicação da lei de outra jurisdição. Qualquer disputa decorrente deste Contrato ou a ele relacionada será resolvida em caráter definitivo por arbitragem internacional administrada pelo International Centre for Dispute Resolution (ICDR), divisão internacional da American Arbitration Association (AAA), sob as Regras de Arbitragem Internacional do ICDR. A sede da arbitragem será Miami, Flórida, Estados Unidos. O idioma da arbitragem será o inglês.

A Empresa poderá buscar medidas cautelares, liminares, injuntivas, equitativas ou de urgência em qualquer juízo competente para proteger propriedade intelectual, Informações Confidenciais, segredos comerciais, software, marcas, clientes, dados, acesso à plataforma ou relacionamentos comerciais, sem renúncia à arbitragem.

## 21. Assinaturas Eletrônicas

Este Contrato e documentos relacionados podem ser assinados, aceitos, armazenados e entregues eletronicamente. Assinaturas eletrônicas, clickwrap, aceite por checkbox, trilhas de auditoria, carimbos de tempo, registros de IP, registros de autenticação e aceite via plataforma são válidos e exigíveis na máxima extensão permitida pela lei aplicável, incluindo as leis de assinatura eletrônica dos EUA aplicáveis e quaisquer módulos de assinatura eletrônica específicos de país anexos a este Contrato.

## 22. Idioma; Versão Prevalecente; Traduções de Referência

Este Contrato é redigido em inglês. A versão em inglês é a versão oficial, regente, prevalecente e juridicamente vinculante para interpretação, cumprimento, execução, resolução de disputas, arbitragem e procedimentos judiciais.

A Empresa poderá fornecer tradução em português ou outro idioma local para conveniência, transparência e compreensão. Qualquer tradução é tradução de referência apenas e não altera, substitui, prevalece sobre nem modifica a versão em inglês. Em caso de inconsistência, ambiguidade, omissão, erro de tradução ou conflito, prevalece a versão em inglês, salvo quando um aditivo específico de país dispuser expressamente em contrário ou quando norma obrigatória aplicável exigir informações em idioma local, termos voltados ao consumidor, informações de privacidade ou cláusulas obrigatórias de transferência de dados.

## 23. Acordo Integral

Este Contrato, o Anexo de Condições Comerciais, o Aditivo de Tratamento de Dados, os Aditivos Específicos de País, o Código de Conduta do Parceiro, as Diretrizes de Marca, a Política de Uso Aceitável e as políticas incorporadas constituem o acordo integral entre as Partes e substituem discussões anteriores relativas ao seu objeto. As Partes assinam este Contrato na página de assinaturas dedicada ao final deste pacote de assinatura.
