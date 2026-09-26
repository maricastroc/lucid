# Tentativa com a chave Free Tier (26/09/2026, 13:10)

A primeira execução da baseline usou, por engano, a chave Free Tier de um projeto novo.
A primeira chamada recebeu HTTP 404: "This model models/gemini-2.5-flash is no longer available
to new users". O runner parou nessa chamada, como previsto para erros fatais. Custo: US$ 0,00
(o 404 não é cobrado e não trouxe usageMetadata).

Guardado como evidência: um projeto novo, sem billing, não tem acesso ao gemini-2.5-flash.
A baseline de verdade está no diretório acima e usa a chave paga original.
