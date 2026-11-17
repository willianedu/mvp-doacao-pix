# Plataforma de Doações e Engajamento Pix - O.S.C Amigos da Mara

Este repositório contém o código-fonte do Minimum Viable Product (MVP) desenvolvido para a O.S.C Amigos da Mara, uma Organização da Sociedade Civil focada no auxílio a crianças carentes.

## O Problema

A O.S.C Amigos da Mara dependia de processos manuais para a gestão de arrecadações e venda de ingressos solidários (ex: Baile à Fantasia). A equipe precisava conferir individualmente os comprovantes Pix via WhatsApp e gerenciar campanhas de forma descentralizada. Essa ineficiência gerava sobrecarga administrativa e falta de transparência em tempo real para os doadores, limitando o potencial de arrecadação.

## A Solução (MVP)

O MVP é um Web App responsivo (mobile-first) focado na automação de doações via Pix. Ele elimina intermediários financeiros e reduz a complexidade técnica, permitindo que a ONG receba doações com liquidez imediata e custo zero (sem taxas de transação).

### Funcionalidades Principais

*   **Para o Doador:**
    *   Página pública da campanha com meta de arrecadação e barra de progresso visual atualizada em tempo real.
    *   Geração instantânea de código Pix "Copia e Cola" e QR Code para o valor selecionado.
    *   Opção de doação anônima ou com identificação (nome/apelido).
*   **Para a Administração (ONG):**
    *   Painel de controle com acesso seguro (autenticação).
    *   Listagem automática das últimas doações e seus status (pendente/aprovado).
    *   Atualização de status integrada via *webhooks* com a API do Mercado Pago, eliminando a conferência manual de extratos.

## Alinhamento com os ODS (ONU)

Este projeto está diretamente conectado ao **ODS 1 — Erradicação da Pobreza**. Ao automatizar o fluxo de doações e reduzir a sobrecarga administrativa, o software permite que a equipe da O.S.C Amigos da Mara redirecione seu tempo para atividades essenciais de acolhimento e amplie sua capacidade de captação de recursos para as crianças atendidas.

## Contribuição

Este é um projeto acadêmico desenvolvido como parte da disciplina de Projeto de Software.
