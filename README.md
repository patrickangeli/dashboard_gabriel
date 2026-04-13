# 📊 Dashboard Financeiro & Gestão de Projetos

Este sistema foi desenvolvido para fornecer uma visão clara, dinâmica e analítica do fluxo de caixa e andamento financeiro de projetos/serviços. 

## 🎯 Objetivo
O principal objetivo da aplicação é centralizar as informações de faturamentos, recebimentos, saídas previstas e lançamentos avulsos. Através de um painel interativo, os gestores podem organizar e acompanhar facilmente o que foi fechado, o que ainda está a receber, visualizar as métricas segmentadas por clientes parceiros e analisar o caixa baseando-se em períodos diários ou atalhos práticos de calendário. O sistema garante o controle absoluto sobre o status dos projetos ("Serviço Fechado", "Em Elaboração", "Em Análise Órgão", "Concluído") em tempo real.

## 🖼️ Telas do Sistema (Screenshots)

*📌 Nota: Insira os prints de tela do sistema dentro de uma pasta `/docs` ou arraste as imagens diretamente pelo GitHub abaixo para ilustrar.*

### Painel Principal e KPIs
![Painel Principal e KPIs](./docs/screenshot_1_kpis.png)  
*(Exemplo visual das métricas como Faturamento Total, Entradas, Saídas e valores A Receber)*

### Análise de Fluxo (Gráficos)
![Análise de Fluxo e Gráficos](./docs/screenshot_2_graficos.png)  
*(Exibe os Gráficos Doughnut de categorias de entradas/saídas e o Faturamento por Parceiro nas linhas e colunas)*

### Filtros e Controle de Projetos
![Filtros do Dashboard](./docs/screenshot_3_filtros.png)  
*(Controles de filtro diário, filtros por status, busca de parceiros e exportação de relatórios via CSV)*

## ✨ Funcionalidades
- **KPIs Dinâmicos**: Acompanhamento geral de Faturamento, Entrada, Saída e Valores a Receber em tempo real.
- **Filtros Avançados e Rápidos**: Filtragem global baseada por dia (Data Inicial / Final) com atalhos de período ("Hoje", "Esta semana", "Este mês").
- **Botão "Aplicar Filtros"**: Otimização de performance com consultas engatilhadas só quando solicitadas pelo usuário.
- **Gestão de Projetos**: Controle focado no status do serviço do parceiro/cliente e atualização contínua do saldo restante.
- **Inclusão de Fluxo Avulso**: Ingestão do controle financeiro paralelo (Previsão de Caixa) garantindo conformidade entre as Despesas Globais da empresa versus receitas da produção técnica.
- **Exportação CSV**: Exportação instantânea de dados filtrados permitindo análise robusta utilizando MS Excel e outras planilhas.
- **Modo Escuro / Claro**: Melhoria na experiência do usuário e conforto visual (Dark Mode).

## 🚀 Tecnologias Integradas
- **Front-end**: React (Vite), Chart.js (React ChartJS 2), CSS customizado.
- **Back-end API**: Express.js (Node.js).
- **Banco de Dados e ORM**: PostgreSQL hospedado na NeonDB integrado usando Prisma ORM.

## 🛠 Como rodar localmente (Desenvolvimento)

1. **Instale as dependências** do Front-end:
   ```bash
   npm install
   ```

2. **Configure suas credenciais** do banco de dados alterando o arquivo `.env` para inserir sua URL do Prisma/PostgreSQL.
   ```env
   DATABASE_URL="postgresql://usuario:senha@host/db?pgbouncer=true"
   ```

3. **Gere os clientes do Prisma** e sincronize o banco de dados:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Inicie o servidor de desenvolvimento** (Irá rodar simultaneamente o Back-end API e Front-end Vite):
   ```bash
   npm run dev
   ```
