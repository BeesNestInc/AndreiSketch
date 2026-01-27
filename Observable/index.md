---
title: SQL Dashboard
---

<import component from="./components/Editor.svelte">

<svelte:component this={component}></svelte:component>

## Existing Plots

```js
// ビルド時（またはプレビュー時）に自動的に上記のスクリプトが走り、JSONが読み込まれる
const adsData = await FileAttachment("./data/campaign.json").json();

// あとはPlotに渡すだけ
display(Plot.plot({
  marks: [
    Plot.lineY(adsData, {x: "date", y: "clicks", stroke: "id"})
  ]
}));

display(Plot.plot({
  marks: [
    Plot.lineY(adsData, {x: "date", y: "cost", stroke: "id"})
  ]
}));

```

<style>

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--sans-serif);
  margin: 4rem 0 8rem;
  text-wrap: balance;
  text-align: center;
}

.hero h1 {
  margin: 1rem 0;
  padding: 1rem 0;
  max-width: none;
  font-size: 14vw;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(30deg, var(--theme-foreground-focus), currentColor);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero h2 {
  margin: 0;
  max-width: 34em;
  font-size: 20px;
  font-style: initial;
  font-weight: 500;
  line-height: 1.5;
  color: var(--theme-foreground-muted);
}

@media (min-width: 640px) {
  .hero h1 {
    font-size: 90px;
  }
}

</style>
