import PQueue from 'p-queue';

// GitHub's secondary rate limits are triggered by too many concurrent requests.
// A queue with a concurrency limit helps us stay within those limits while
// still processing requests in parallel for performance. We'll set a
// reasonable limit, like 10, to avoid being flagged.
const queue = new PQueue({ concurrency: 10 });

export default queue; 