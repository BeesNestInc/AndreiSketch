<script>
  import * as Plot from "@observablehq/plot";
  import * as Tempo from "@formkit/tempo";

  // Svelte 5のRunes（$state）を使って状態を管理します
  let code = $state('SELECT * FROM onprem_pg.sp_campaign_daily LIMIT 5;');
  let language = $state('sql'); // 'sql', 'js-server', 'js-client'
  let cells = $state([]); // 実行結果のセルを保持する配列
  let error = $state(null);
  let isLoading = $state(false);
  let cellIdCounter = $state(1); // セルに一意のIDを振るためのカウンター

  let deletedCellsHistory = $state([]); // 削除されたセルの履歴を保持するスタック

  // 直前のSQL結果を保持するための変数
  let lastSqlData = null;

  const execute = async (execCode, execLang, cellId = null) => {
    isLoading = true;
    error = null;
    
    // 何か実行されたらUndo履歴はクリアするのが一般的
    deletedCellsHistory = [];

    try {
      let resultData;
      
      if (execLang === 'js-client') {
        const context = { Plot, Tempo, data: lastSqlData, console };
        const func = new Function(...Object.keys(context), execCode);
        resultData = await func(...Object.values(context));
      } else {
        const response = await fetch('http://localhost:3000/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: execLang, code: execCode }),
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.details || `HTTP error! status: ${response.status}`);
        }
        resultData = await response.json();
      }

      if (execLang === 'sql') {
        lastSqlData = resultData;
      }

      if (cellId !== null) {
        // --- 上書き処理 ---
        const targetCell = cells.find(c => c.id === cellId);
        if (targetCell) {
          targetCell.code = execCode;
          targetCell.language = execLang;
          targetCell.result = resultData;
          targetCell.status = 'success';
        }
      } else {
        // --- 新規追加処理 ---
        cells.unshift({
          id: cellIdCounter++,
          language: execLang,
          code: execCode,
          result: resultData,
          status: 'success',
        });
      }

    } catch (e) {
        if (cellId !== null) {
            // --- エラー時の上書き処理 ---
            const targetCell = cells.find(c => c.id === cellId);
            if (targetCell) {
                targetCell.code = execCode;
                targetCell.language = execLang;
                targetCell.result = { message: e.message };
                targetCell.status = 'error';
            }
        } else {
            // --- エラー時の新規追加処理 ---
            cells.unshift({
                id: cellIdCounter++,
                language: execLang,
                code: execCode,
                result: { message: e.message },
                status: 'error',
            });
        }
    } finally {
      isLoading = false;
    }
  };

  const deleteCell = (idToDelete) => {
    const index = cells.findIndex(cell => cell.id === idToDelete);
    if (index !== -1) {
        // 削除情報をスタックに積む
        deletedCellsHistory.push({ cell: cells[index], index: index });
        cells.splice(index, 1);
    }
  };
  
  const undoDelete = () => {
    if (deletedCellsHistory.length > 0) {
        const lastDeleted = deletedCellsHistory.pop();
        // 元の位置に復元
        cells.splice(lastDeleted.index, 0, lastDeleted.cell);
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
  .main-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
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
    box-sizing: border-box; /* paddingを含めた幅計算に */
  }
  button {
    padding: 0.5rem 1rem;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
  }
  button.secondary {
      background-color: #6c757d;
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
  .cell-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 1rem;
  }
  .cell-input-label {
    font-family: monospace;
    font-weight: bold;
    color: #666;
    padding-top: 0.5rem;
  }
  .result-item {
    border: 1px solid #eee;
    padding: 1rem;
    border-radius: 4px;
    flex-grow: 1;
    position: relative;
  }
  .cell-actions {
    margin-top: 0.5rem;
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
    white-space: pre-wrap;
  }
  details > summary {
    cursor: pointer;
    margin-bottom: 0.5rem;
    font-weight: bold;
    font-size: 0.9em;
  }
  .delete-button {
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 14px;
    line-height: 24px;
    text-align: center;
    cursor: pointer;
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0;
    z-index: 10;
  }
</style>

<div class="editor-container">
  <h3>Multi-language Editor</h3>
  
  <div class="main-actions">
    <div class="controls">
        <select bind:value={language}>
          <option value="sql">SQL</option>
          <option value="js-server">JS (Server)</option>
          <option value="js-client">JS (Client)</option>
        </select>
        <button onclick={() => execute(code, language)} disabled={isLoading}>
          {#if isLoading} 実行中... {:else} 実行 {/if}
        </button>
    </div>
    {#if deletedCellsHistory.length > 0}
        <button onclick={undoDelete} class="secondary">
            元に戻す ({deletedCellsHistory.length})
        </button>
    {/if}
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
    {#each cells as cell (cell.id)}
      <div class="cell-wrapper">
        <div class="cell-input-label">In [{cell.id}]:</div>
        <div class="result-item">
          <button class="delete-button" onclick={() => deleteCell(cell.id)} aria-label="セルを削除">×</button>
          
          <details>
             <summary>コード ({cell.language})</summary>
             <textarea bind:value={cell.code}></textarea>
             <div class="cell-actions">
                <button onclick={() => execute(cell.code, cell.language, cell.id)} disabled={isLoading}>
                  再実行
                </button>
              </div>
          </details>

          <details open>
            <summary>結果 <span style="font-size: 0.8em; color: {cell.status === 'success' ? 'green' : 'red'}">({cell.status})</span></summary>
            {#if cell.status === 'success'}
              <div class="result-data">
                {#if isTableData(cell.result)}
                  <table>
                    <thead>
                      <tr>
                        {#each Object.keys(cell.result[0]) as header}
                          <th>{header}</th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody>
                      {#each cell.result as row}
                        <tr>
                          {#each Object.values(row) as item}
                            <td>{item}</td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {:else if cell.result !== undefined && cell.result !== null}
                   <pre>{JSON.stringify(cell.result, null, 2)}</pre>
                {:else}
                  <p>実行完了（表示可能なデータなし）</p>
                {/if}
              </div>
            {:else}
               <div class="error">
                 <pre>{cell.result.message}</pre>
              </div>
            {/if}
          </details>
        </div>
      </div>
    {/each}
  </div>
</div>