import { test } from '@playwright/test'
import { generateId, getSecondPage, PlatformSetting, PlatformURI } from '../utils'
import { allure } from 'allure-playwright'
import { NewIssue } from '../model/tracker/types'
import { IssuesPage } from '../model/tracker/issues-page'
import { LeftSideMenuPage } from '../model/left-side-menu-page'
import { IssuesDetailsPage } from '../model/tracker/issues-details-page'

test.use({
  storageState: PlatformSetting
})

test.describe('Collaborative test for issue', () => {
  test.beforeEach(async ({ page }) => {
    await allure.parentSuite('Collaborative test')
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
  })

  test('Issues can be assigned to another users', async ({ page, browser }) => {
    const newIssue: NewIssue = {
      title: `Collaborative test for issue-${generateId()}`,
      description: 'Collaborative test for issue',
      status: 'Backlog',
      priority: 'Urgent',
      assignee: 'Appleseed John',
      createLabel: true,
      labels: `CREATE-ISSUE-${generateId()}`,
      component: 'No component',
      estimation: '2',
      milestone: 'No Milestone',
      duedate: 'today',
      filePath: 'cat.jpeg'
    }

    // open second page
    const userSecondPage = await getSecondPage(browser)
    await (await userSecondPage.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
    const leftSideMenuPageSecond = new LeftSideMenuPage(userSecondPage)
    await leftSideMenuPageSecond.buttonTracker.click()
    const issuesPageSecond = new IssuesPage(userSecondPage)
    await issuesPageSecond.linkSidebarAll.click()
    await issuesPageSecond.modelSelectorAll.click()

    // create a new issue by first user
    await (await page.goto(`${PlatformURI}/workbench/sanity-ws/tracker/`))?.finished()
    const leftSideMenuPage = new LeftSideMenuPage(page)
    await leftSideMenuPage.buttonTracker.click()

    const issuesPage = new IssuesPage(page)
    await issuesPage.createNewIssue(newIssue)
    await issuesPage.linkSidebarAll.click()
    await issuesPage.modelSelectorAll.click()
    await issuesPage.searchIssueByName(newIssue.title)
    await issuesPage.openIssueByName(newIssue.title)

    // check created issued by second user
    await issuesPageSecond.searchIssueByName(newIssue.title)
    await issuesPageSecond.openIssueByName(newIssue.title)

    const issuesDetailsPageSecond = new IssuesDetailsPage(userSecondPage)
    await issuesDetailsPageSecond.checkIssue({
      ...newIssue,
      milestone: 'Milestone',
      estimation: '2h'
    })
  })
})
