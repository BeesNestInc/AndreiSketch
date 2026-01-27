
<script>
  import * as Plot from "@observablehq/plot";
  import * as Tempo from "@formkit/tempo";

  // Svelte 5のRunes（$state）を使って状態を管理します
  let code = $state('SELECT * FROM onprem_pg.sp_campaign_daily LIMIT 5;');
  let language = $state('sql'); // 'sql', 'js-server', 'js-client'
  let results = $state([]); // 実行結果の履歴を保持する配列
  let error = $state(null);
  let isLoading = $state(false);

  // 直前のSQL結果を保持するための変数
  let lastSqlData = null;

  const execute = async () => {
    isLoading = true;
    error = null;

    try {
      let resultData;
      
      if (language === 'js-client') {
        // クライアントサイドでのJS実行
        const context = {
          Plot,
          Tempo,
          data: lastSqlData, // 直前のSQL結果を 'data' として注入
          console,
        };
        // new Function() で実行。引数名としてコンテキストのキーを渡し、値を渡す。
        const func = new Function(...Object.keys(context), code);
        resultData = await func(...Object.values(context));

      } else {
        // サーバーサイドでの実行 (sql, js-server)
        const response = await fetch('http://localhost:3000/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, code }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.details || `HTTP error! status: ${response.status}`);
        }
        resultData = await response.json();
      }

      // 直前の結果がSQLだった場合、クライアントサイドJSで使えるように保持
      if (language === 'sql') {
        lastSqlData = resultData;
      }
      
      // 結果を履歴の先頭に追加
      results.unshift({
        type: language,
        data: resultData,
        timestamp: new Date(),
        code,
      });

    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  };

  const isTableData = (data) => {
    return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null;
  }
</script>

<style>
  /* 簡易的なスタイル */
  .editor-container {
    font-family: sans-serif;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    max-width: 100%;
    margin: 1rem 0;
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  textarea {
    width: 100%;
    min-height: 100px;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
  }
  button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled {
    background-color: #ccc;
  }
  .error {
    color: red;
    margin-top: 1rem;
    white-space: pre-wrap;
  }
  .result-history {
    margin-top: 1rem;
  }
  .result-item {
    border: 1px solid #eee;
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }
  .result-meta {
    font-size: 0.8rem;
    color: #666;
    margin-bottom: 0.5rem;
  }
  .result-data {
     overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
  }
  pre {
    background-color: #f8f8f8;
    padding: 1rem;
    border-radius: 4px;
  }
</style>

<div class="editor-container">
  <h3>Multi-language Editor</h3>
  
  <div class="controls">
    <select bind:value={language}>
      <option value="sql">SQL</option>
      <option value="js-server">JS (Server)</option>
      <option value="js-client">JS (Client)</option>
    </select>
    <button onclick={execute} disabled={isLoading}>
      {#if isLoading}
        実行中...
      {:else}
        実行
      {/if}
    </button>
  </div>

  <textarea bind:value={code}></textarea>

  {#if error}
    <div class="error">
      <h4>エラー</h4>
      <pre>{error}</pre>
    </div>
  {/if}

  <div class="result-history">
    <h3>実行履歴</h3>
    {#each results as result}
      <div class="result-item">
        <div class="result-meta">
          <strong>{result.type}</strong> @ {result.timestamp.toLocaleString()}
        </div>
        <div class="result-data">
          {#if isTableData(result.data)}
            <table>
              <thead>
                <tr>
                  {#each Object.keys(result.data[0]) as header}
                    <th>{header}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each result.data as row}
                  <tr>
                    {#each Object.values(row) as cell}
                      <td>{cell}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else if result.data !== undefined}
             <pre>{JSON.stringify(result.data, null, 2)}</pre>
          {:else}
            <p>実行完了（表示可能なデータなし）</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
