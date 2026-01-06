export const starWarsUrl =
  "https://platform.ontotext.com/semantic-objects/_downloads/2043955fe25b183f32a7f6b6ba61d5c2/SWAPI-WD-data.ttl";
export const starWarsTtl = await fetch(starWarsUrl)
  .then((response) => response.text());
