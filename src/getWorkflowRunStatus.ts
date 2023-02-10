import {Octokit} from '@octokit/rest'
import {getInput} from '@actions/core'
import moment from 'moment'
export async function getWorkflowRunStatus(): Promise<{
  elapsedSeconds: number
  conclusion: string
}> {
  const runInfo = getRunInformation()
  const githubToken = getInput('github-token', {required: true})
  const octokit = new Octokit({
    auth: `token ${githubToken}`,
    baseUrl: `${process.env.GITHUB_API_URL}`
  })
  const workflowJobs = await octokit.actions.listJobsForWorkflowRun({
    owner: runInfo.owner,
    repo: runInfo.repo,
    run_id: parseInt(runInfo.runId || '1')
  })

  let lastStep: any = {}
  let jobStartDate

  /**
   * We have to verify all jobs steps. We don't know
   * if users are using multiple jobs or not. Btw,
   * we don't need to check if GITHUB_JOB env is the
   * same of the Octokit job name, because it is different.
   *
   * @note We are using a quadratic way to search all steps.
   * But we have just a few elements, so this is not
   * a performance issue
   *
   * The conclusion steps, according to the documentation, are:
   * <success>, <cancelled>, <failure> and <skipped>
   */
  let abort = false
  for (let job of workflowJobs.data.jobs) {
    for (let step of job.steps) {
      // check if current step still running
      if (step.completed_at !== null) {
        lastStep = step
        jobStartDate = job.started_at
        // Some step/job has failed. Get out from here.
        if (step?.conclusion !== 'success' && step?.conclusion !== 'skipped') {
          abort = true
          break
        }
        /**
         * If nothing has failed, so we have a success scenario
         * @note ignoring skipped cases.
         */
        lastStep.conclusion = 'success'
      }
    }
    // // Some step/job has failed. Get out from here.
    if (abort) break
  }
  const startTime = moment(jobStartDate, moment.ISO_8601)
  const endTime = moment(lastStep?.completed_at, moment.ISO_8601)

  return {
    elapsedSeconds: endTime.diff(startTime, 'seconds'),
    conclusion: lastStep?.conclusion
  }
}

export function getRunInformation() {
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')
  return {
    owner,
    repo,
    ref: process.env.GITHUB_SHA || undefined,
    branchUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_REF}`,
    runId: process.env.GITHUB_RUN_ID || undefined,
    runNum: process.env.GITHUB_RUN_NUMBER || undefined
  }
}
