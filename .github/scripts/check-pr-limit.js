module.exports = async function checkPRLimit({ context, github, core }) {
  const { owner, repo } = context.repo;
  const maxPRs = parseInt(process.env.MAX_PRS || '1', 10);
  const currentPRNumber = context.payload.pull_request?.number;

  if (!currentPRNumber) {
    core.setFailed('PR number not found in context');
    return;
  }

  try {
    const openPRCount = await getOpenPRCount(github, owner, repo);
    console.log(`현재 열려있는 PR 개수: ${openPRCount}`);
    
    if (openPRCount > maxPRs) {
      await handlePRLimitExceeded(github, owner, repo, currentPRNumber, openPRCount, maxPRs);
      core.setFailed(`PR이 자동으로 닫혔습니다: ${openPRCount}개 > ${maxPRs}개`);
    } else {
      console.log(`✅ PR 개수 확인 완료: ${openPRCount}개 (최대 ${maxPRs}개)`);
    }
  } catch (error) {
    core.setFailed(`PR limit check failed: ${error.message}`);
  }
};

async function getOpenPRCount(github, owner, repo) {
  const { data: openPRs } = await github.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    per_page: 100
  });
  return openPRs.length;
}

async function handlePRLimitExceeded(github, owner, repo, prNumber, currentCount, maxCount) {
  const message = createLimitExceededMessage(currentCount, maxCount);
  
  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: message
  });
  
  await github.rest.pulls.update({
    owner,
    repo,
    pull_number: prNumber,
    state: 'closed'
  });
}

function createLimitExceededMessage(currentCount, maxCount) {
  return `❌ PR 개수 제한 초과로 자동 닫힘\n\n` +
    `현재 열려있는 PR: ${currentCount}개\n` +
    `최대 허용 PR: ${maxCount}개\n\n` +
    `기존 PR을 먼저 머지하거나 닫은 후 다시 PR을 생성해주세요.`;
}
