// ==========================================================================
// desafio/js/admin-render.js — renderização compartilhada entre
// desafio/admin/index.html e a aba "Processo" (desafio/processo/index.html).
// Script clássico, mesmo padrão de desafio/js/auth.js: funções soltas no
// topo, sem wrapper/objeto. Cada página busca seus próprios dados e chama
// essas funções passando o que já buscou — não fazem query nenhuma aqui.
// ==========================================================================

function renderKpiRow({ totalCadastradas, ativasEssaSemana, pctUltimoDia, ultimoDia, videosPendentes }) {
  return `
    <div class="kpi-row">
      <div class="kpi"><div class="v">${totalCadastradas || 0}</div><div class="l">cadastradas</div></div>
      <div class="kpi"><div class="v">${ativasEssaSemana}</div><div class="l">ativas essa semana</div></div>
      <div class="kpi"><div class="v">${pctUltimoDia}%</div><div class="l">completaram o dia ${ultimoDia ? ultimoDia.numero_dia : ''}</div></div>
      <div class="kpi"><div class="v">${videosPendentes}</div><div class="l">vídeos pra avaliar</div></div>
    </div>
  `;
}

function renderAdminGrid({ proximoNumero, ranking, bonusHistorico }) {
  return `
    <div class="admin-grid">
      <div class="admin-col card">
        <h4>Publicar desafio do dia</h4>
        <form id="form-desafio">
          <div class="campo"><label>Dia</label><input type="number" id="f-numero" value="${proximoNumero}" min="1" required></div>
          <div class="campo"><label>Título</label><input type="text" id="f-titulo" required placeholder="Ex: Escolha roupa e cenário pro próximo vídeo"></div>
          <div class="campo"><label>Descrição</label><textarea id="f-descricao" required placeholder="O que a pessoa precisa fazer hoje"></textarea></div>
          <div class="check-row"><input type="checkbox" id="f-video"> Aceita vídeo opcional pra avaliação</div>
          <div id="form-msg" class="msg msg-erro" hidden></div>
          <button type="submit" class="btn btn-primary">Publicar desafio</button>
        </form>
      </div>

      <div class="admin-col card">
        <h4>Ranking geral</h4>
        <table class="admin-table">
          <tr><th>Participante</th><th>Pontos</th></tr>
          ${(ranking || []).map((r) => `<tr><td>${r.nome} <span style="color:var(--texto-suave);">${r.instagram || ''}</span></td><td>${r.pontos}</td></tr>`).join('') || '<tr><td colspan="2">Ninguém cadastrado ainda.</td></tr>'}
        </table>
        <p class="footnote">1pt por desafio feito · +2 por vídeo enviado · +1 por fazer em até 48h · +2 por amiga indicada · bônus manual.</p>

        <h4 style="margin-top:26px;">Dar pontos bônus</h4>
        <form id="form-bonus">
          <div class="campo">
            <label>@ do Instagram</label>
            <input type="text" id="b-participante-insta" list="lista-participantes" placeholder="@instagram da pessoa" required>
            <datalist id="lista-participantes">
              ${(ranking || []).map((r) => `<option value="${r.instagram || ''}">${r.nome}</option>`).join('')}
            </datalist>
          </div>
          <div class="campo">
            <label>Motivo:</label>
            <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
              <div class="chip-row">
                <span class="chip chip-motivo" data-motivo="compartilhou nos stories me marcando" data-pontos="2">📱 Story me marcando</span>
                <span class="chip chip-motivo" data-motivo="comentou no vídeo do desafio no Instagram" data-pontos="1">💬 Comentou no vídeo</span>
              </div>
              <div class="kpi" style="flex:0 0 110px; text-align:center;">
                <div class="v" id="bonus-pontos-preview">0</div>
                <div class="l">pontos a dar</div>
              </div>
            </div>
          </div>
          <div id="bonus-msg" class="msg msg-erro" hidden></div>
          <button type="submit" class="btn btn-primary" style="width:auto;padding:11px 22px;">Dar pontos</button>
        </form>

        ${(bonusHistorico && bonusHistorico.length) ? `
          <table class="admin-table" style="margin-top:20px;">
            <tr><th>Participante</th><th>Pontos</th><th>Motivo</th></tr>
            ${bonusHistorico.map((b) => `<tr><td>${b.desafio_perfis?.nome || ''}</td><td>+${b.pontos}</td><td>${b.motivo}</td></tr>`).join('')}
          </table>
        ` : ''}
      </div>
    </div>
  `;
}

// Precisa do `ranking` já buscado pra achar a participante pelo @ digitado
// no formulário de bônus, sem refazer a query.
function wireAdminGridHandlers(db, ranking, { onChanged }) {
  document.getElementById('form-desafio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formMsg = document.getElementById('form-msg');
    formMsg.hidden = true;
    const { error } = await db.from('desafio_dias').insert({
      numero_dia: Number(document.getElementById('f-numero').value),
      titulo: document.getElementById('f-titulo').value.trim(),
      descricao: document.getElementById('f-descricao').value.trim(),
      pede_video: document.getElementById('f-video').checked,
    });
    if (error) {
      formMsg.textContent = error.message.includes('duplicate') ? 'Já existe um desafio com esse número de dia.' : error.message;
      formMsg.hidden = false;
      return;
    }
    onChanged();
  });

  function atualizarPreviewBonus() {
    const selecionados = [...document.querySelectorAll('.chip-motivo.sel')];
    const total = selecionados.reduce((soma, chip) => soma + Number(chip.dataset.pontos), 0);
    document.getElementById('bonus-pontos-preview').textContent = total;
  }

  document.querySelectorAll('.chip-motivo').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('sel');
      atualizarPreviewBonus();
    });
  });

  document.getElementById('form-bonus').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bonusMsg = document.getElementById('bonus-msg');
    bonusMsg.hidden = true;

    const selecionados = [...document.querySelectorAll('.chip-motivo.sel')];
    if (!selecionados.length) {
      bonusMsg.textContent = 'Marca pelo menos um motivo.';
      bonusMsg.hidden = false;
      return;
    }
    const pontos = selecionados.reduce((soma, chip) => soma + Number(chip.dataset.pontos), 0);
    const motivoBruto = selecionados.map((chip) => chip.dataset.motivo).join(' e ');
    const motivo = motivoBruto.charAt(0).toUpperCase() + motivoBruto.slice(1);

    const instaDigitado = document.getElementById('b-participante-insta').value.trim().toLowerCase();
    const encontrada = (ranking || []).find((r) => (r.instagram || '').trim().toLowerCase() === instaDigitado);
    if (!encontrada) {
      bonusMsg.textContent = 'Não achei ninguém com esse @. Confere se digitou certinho (a lista sugere enquanto você digita).';
      bonusMsg.hidden = false;
      return;
    }

    const { error } = await db.from('desafio_bonus').insert({
      participante_id: encontrada.participante_id,
      pontos,
      motivo,
    });
    if (error) {
      bonusMsg.textContent = error.message;
      bonusMsg.hidden = false;
      return;
    }
    onChanged();
  });
}

function renderVideoQueue(videos) {
  return (videos && videos.length) ? videos.map((v) => `
    <div class="vq-item" data-id="${v.id}">
      <div class="vq-info">
        <div class="nome">${v.desafio_perfis?.nome || ''} <span class="vq-status ${v.desafio_feedback ? 'avaliado' : 'aguardando'}">${v.desafio_feedback ? 'avaliado' : 'aguardando'}</span></div>
        <div class="meta">Dia ${v.desafio_dias?.numero_dia} · ${v.desafio_dias?.titulo || ''} · <span class="vq-link" data-path="${v.video_path}">ver vídeo</span></div>
        <textarea class="campo-feedback" placeholder="Escreve o feedback...">${v.desafio_feedback?.texto || ''}</textarea>
      </div>
      <div class="vq-action">
        <button type="button" class="btn btn-primary btn-feedback" data-conclusao="${v.id}">${v.desafio_feedback ? 'Atualizar feedback' : 'Enviar feedback'}</button>
      </div>
    </div>
  `).join('') : '<p class="vazio">Nenhum vídeo enviado ainda.</p>';
}

function wireVideoQueueHandlers(db, { onChanged }) {
  document.querySelectorAll('.vq-link').forEach((el) => {
    el.addEventListener('click', async () => {
      const { data, error } = await db.storage.from('desafio-videos').createSignedUrl(el.dataset.path, 3600);
      if (!error && data) window.open(data.signedUrl, '_blank');
    });
  });

  document.querySelectorAll('.btn-feedback').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = btn.closest('.vq-item');
      const texto = item.querySelector('.campo-feedback').value.trim();
      if (!texto) return;
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      await db.from('desafio_feedback').upsert(
        { conclusao_id: btn.dataset.conclusao, texto },
        { onConflict: 'conclusao_id' }
      );
      onChanged();
    });
  });
}
