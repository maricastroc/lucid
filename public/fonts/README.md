# A fonte embutida no PDF

Esta é a mesma face que o Lucid usa na tela: `.prose-doc` é serifada, e título, item de lista e
cabeçalho de tabela herdam dela. O documento exportado segue a mesma regra, para que a página
impressa e a página na tela sejam o mesmo texto.

| Arquivo                     | Face               | Origem                | Licença                                            |
| --------------------------- | ------------------ | --------------------- | -------------------------------------------------- |
| `SourceSerif4-Regular.ttf`  | corpo do texto     | Source Serif 4, Adobe | SIL Open Font License 1.1 — `SourceSerif4-OFL.txt` |
| `SourceSerif4-SemiBold.ttf` | título e cabeçalho | Source Serif 4, Adobe | idem                                               |

Os arquivos são o subconjunto latino publicado pelo Fontsource, descomprimido de `.woff2` para
`.ttf` — que é o formato que o PDF aceita. O subconjunto cobre todo o português: acentos, cedilha,
ordinais e a pontuação tipográfica são conferidos glifo a glifo em teste.

**TrueType, obrigatoriamente.** O jsPDF só embute contornos `glyf`. Uma fonte OpenType-PS (`CFF `),
como a Geist que esteve aqui, é aceita sem erro e sai como lixo na página. `isTrueType` recusa o
arquivo antes de embutir, e o PDF cai para a fonte padrão do formato em vez de sair corrompido.

O número da página usa a Helvetica padrão do PDF — não é o documento, e não justifica embutir uma
segunda família.

O `.docx` NÃO embute: ele existe para ser editado, e fonte embutida no Word vale só para leitura.
Ele nomeia Cambria e Calibri, que acompanham o Office nos dois sistemas.
