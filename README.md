# Andrei Sketch

対話的BIツールです。

Jupyter Notebook的な操作で多言語対応たワークベンチです。

現在のところ、

* SQL
* server side Javascript
* front Javascript

に対応しています。

## 名称について

元々、データを集計するためにPostgreSQLにデータを集積していました。
これを別途集計用データベースに移すことなく、データ集計をし、可視化したいと考えました。

そこでまず

* SQLを投じて処理をし、そのデータを得ること
* 得たデータをサーバサイドで集計すること
* 集計されたものを可視化すること

という基本仕様を考え、そこで「試行錯誤」するためにJupyter Notebook的な操作を考え、それが共存して実行する環境を作ることにしました。

そこで

* SQL
* server side Javascript
* front Javascript

をまず実行することを思った次第です。

元々広告システムの一部として書き始めたのですが、これ単独でリリースすることを考えて、名前を作る時に、
「三位一体的だな」
「三位一体でググってみるか」
「また[Wikipedia](https://ja.wikipedia.org/wiki/%E4%B8%89%E4%BD%8D%E4%B8%80%E4%BD%93)だ」
「絵があるぞ」
「至聖三者が出て来た」
「誰の作だ？」
「Andrei Rublev」
ということで、この名前となりました。
これは「[Hieronymus](https://github.com/BeesNestInc/hieronymus)」と同じ過程です。
