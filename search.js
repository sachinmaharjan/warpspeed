async function go() {
  const result = await fetch("https://html.duckduckgo.com/html/?q=site:github.com+%22Space_Corrected.csv%22");
  const text = await result.text();
  const urls = text.match(/href="([^"]+Space_Corrected\.csv)"/g) || [];
  console.log(urls);
}
go();
