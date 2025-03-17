import { Octokit } from '@octokit/rest';

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Upload an image to GitHub repository
export const uploadImage = async (
  fileName: string,
  fileContent: string,
  folderPath: string = 'images'
) => {
  try {
    // Remove data URL prefix if present
    let content = fileContent;
    if (content.startsWith('data:')) {
      content = content.split(',')[1];
    }

    // Create or update the file in the repository
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER as string,
      repo: process.env.GITHUB_REPO_NAME as string,
      path: `${folderPath}/${fileName}`,
      message: `Upload ${fileName}`,
      content,
      committer: {
        name: 'Event System',
        email: 'event-system@example.com',
      },
    });

    // Return the URL to the uploaded image
    return {
      success: true,
      url: `https://raw.githubusercontent.com/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/main/${folderPath}/${fileName}`,
      data: response.data,
    };
  } catch (error) {
    console.error('Error uploading image to GitHub:', error);
    return {
      success: false,
      error,
    };
  }
};

// Delete an image from GitHub repository
export const deleteImage = async (
  fileName: string,
  folderPath: string = 'images'
) => {
  try {
    // Get the file first to get its SHA
    const file = await octokit.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER as string,
      repo: process.env.GITHUB_REPO_NAME as string,
      path: `${folderPath}/${fileName}`,
    });

    // Check if the file exists and has the expected structure
    if (!Array.isArray(file.data) && 'sha' in file.data) {
      // Delete the file
      const response = await octokit.repos.deleteFile({
        owner: process.env.GITHUB_REPO_OWNER as string,
        repo: process.env.GITHUB_REPO_NAME as string,
        path: `${folderPath}/${fileName}`,
        message: `Delete ${fileName}`,
        sha: file.data.sha,
      });

      return {
        success: true,
        data: response.data,
      };
    } else {
      throw new Error('File not found or unexpected response structure');
    }
  } catch (error) {
    console.error('Error deleting image from GitHub:', error);
    return {
      success: false,
      error,
    };
  }
}; 