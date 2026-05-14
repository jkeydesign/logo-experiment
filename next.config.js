const isGithubPages = process.env.GITHUB_PAGES === 'true' && process.env.NODE_ENV === 'production'
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'logo-experiment'
const isUserPage = repoName.endsWith('.github.io')
const basePath = isGithubPages && !isUserPage ? `/${repoName}` : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isGithubPages
    ? {
        output: 'export',
        basePath,
        assetPrefix: basePath ? `${basePath}/` : undefined,
        images: { unoptimized: true },
      }
    : {}),
}

module.exports = nextConfig
