module.exports = {
  apps : [{
    name: 'nlm-proxy-esg',
    script: 'server.js',
    env: {
      PORT: 3000,
      NOTEBOOK_ALIAS: 'notee',
      SERVICE_NAME: '리맨 지식 정보 AI',
      SERVICE_SUBTITLE: '리맨의 사내 규정, 정보, 기업 정보 자산에 대해 무엇이든 물어보세요.',
      AUTH_REQUIRED: 'true',
      USERS_FILENAME: 'users_esg.json'
    }
  }, {
    name: 'nlm-proxy-replus',
    script: 'server.js',
    env: {
      PORT: 3001,
      NOTEBOOK_ALIAS: 'replus',
      SERVICE_NAME: '리플러스 자원순환 AI',
      SERVICE_SUBTITLE: '리플러스 서비스, 기부, 자원순환 관련 내용을 물어보세요.',
      AUTH_REQUIRED: 'false',
      USERS_FILENAME: 'users_replus.json'
    }
  }, {
    name: 'nlm-tunnel',
    script: 'C:\\Users\\hyban.DESKTOP-T81OV0G\\AppData\\Roaming\\npm\\node_modules\\cloudflared\\bin\\cloudflared.exe',
    args: 'tunnel --config d:\\Vcoding\\MCP_notebookLM\\config.yml run nlm-tunnel',
    interpreter: 'none'
  }]
};
