
<script>
  // Svelte 5のRunes（$state）を使って状態を管理します
  let sql = $state('SELECT * FROM onprem_pg.sp_campaign_daily LIMIT 5;');
  let result = $state(null);
  let error = $state(null);
  let isLoading = $state(false);

  const executeQuery = async () => {
    isLoading = true;
    error = null;
    result = null;

    try {
      const response = await fetch('http://localhost:3000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      result = data;

    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  };
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
  .result-container {
    margin-top: 1rem;
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
</style>

<div class="editor-container">
  <h3>SQL Editor</h3>
  <textarea bind:value={sql}></textarea>
  <button onclick={executeQuery} disabled={isLoading}>
    {#if isLoading}
      実行中...
    {:else}
      実行
    {/if}
  </button>

  {#if error}
    <div class="error">
      <h4>エラー</h4>
      <pre>{error}</pre>
    </div>
  {/if}

  {#if result}
    <div class="result-container">
      <h4>結果</h4>
      {#if result.length > 0}
        <table>
          <thead>
            <tr>
              {#each Object.keys(result[0]) as header}
                <th>{header}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each result as row}
              <tr>
                {#each Object.values(row) as cell}
                  <td>{cell}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p>結果は0件です。</p>
      {/if}
    </div>
  {/if}
</div>
