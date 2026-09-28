export type ProblemDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ProblemTemplate = {
  id: string;
  title: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: string;
  tests: Array<{ name: string; input: string; expected: string; hidden?: boolean }>;
};

export const PROBLEM_TEMPLATES: ProblemTemplate[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    tags: ['Array', 'Hash Map'],
    description: 'Given an array of integers and a target, return the indices of two numbers whose values add up to the target. Assume exactly one valid answer exists.',
    constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', '-10⁹ ≤ target ≤ 10⁹'],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '2 + 7 = 9.' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' }
    ],
    starterCode: 'def two_sum(nums, target):\n    # return the two indices\n    pass\n',
    tests: [
      { name: 'Example 1', input: '2 7 11 15\n9', expected: '[0, 1]' },
      { name: 'Example 2', input: '3 2 4\n6', expected: '[1, 2]' },
      { name: 'Single pair', input: '3 3\n6', expected: '[0, 1]', hidden: true }
    ]
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    tags: ['Stack', 'String'],
    description: 'Determine whether every opening bracket is closed by the same type of bracket in the correct order.',
    constraints: ['1 ≤ s.length ≤ 10⁴', 's contains only (), {}, and []'],
    examples: [
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "([)]"', output: 'false' }
    ],
    starterCode: 'def is_valid(s):\n    pass\n',
    tests: [
      { name: 'Balanced', input: '()[]{}', expected: 'true' },
      { name: 'Nested', input: '([{}])', expected: 'true' },
      { name: 'Mismatched', input: '([)]', expected: 'false', hidden: true }
    ]
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'EASY',
    tags: ['Array', 'Binary Search'],
    description: 'Given a sorted array of distinct integers, return the index of target or -1 if it does not exist.',
    constraints: ['1 ≤ nums.length ≤ 10⁵', 'nums is sorted ascending', 'All values are distinct'],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' }
    ],
    starterCode: 'def search(nums, target):\n    pass\n',
    tests: [
      { name: 'Found', input: '-1 0 3 5 9 12\n9', expected: '4' },
      { name: 'Missing', input: '-1 0 3 5 9 12\n2', expected: '-1' },
      { name: 'Single value', input: '5\n5', expected: '0', hidden: true }
    ]
  },
  {
    id: 'best-time-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'EASY',
    tags: ['Array', 'Greedy'],
    description: 'Given daily prices, choose one buy day and one later sell day to maximize profit. Return 0 if no profit is possible.',
    constraints: ['1 ≤ prices.length ≤ 10⁵', '0 ≤ prices[i] ≤ 10⁴'],
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5' },
      { input: 'prices = [7,6,4,3,1]', output: '0' }
    ],
    starterCode: 'def max_profit(prices):\n    pass\n',
    tests: [
      { name: 'Profit available', input: '7 1 5 3 6 4', expected: '5' },
      { name: 'No profit', input: '7 6 4 3 1', expected: '0' },
      { name: 'Two days', input: '2 9', expected: '7', hidden: true }
    ]
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'MEDIUM',
    tags: ['String', 'Sliding Window'],
    description: 'Return the length of the longest substring that contains no repeated characters.',
    constraints: ['0 ≤ s.length ≤ 5 × 10⁴', 's contains printable ASCII characters'],
    examples: [
      { input: 's = "abcabcbb"', output: '3' },
      { input: 's = "bbbbb"', output: '1' }
    ],
    starterCode: 'def length_of_longest_substring(s):\n    pass\n',
    tests: [
      { name: 'abcabcbb', input: 'abcabcbb', expected: '3' },
      { name: 'All same', input: 'bbbbb', expected: '1' },
      { name: 'Empty', input: '', expected: '0', hidden: true }
    ]
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'MEDIUM',
    tags: ['Array', 'Sorting'],
    description: 'Merge all overlapping intervals and return a list of pairwise disjoint intervals covering the same ranges.',
    constraints: ['1 ≤ intervals.length ≤ 10⁴', 'intervals[i].length = 2'],
    examples: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' }
    ],
    starterCode: 'def merge(intervals):\n    pass\n',
    tests: [
      { name: 'Overlapping', input: '1 3;2 6;8 10;15 18', expected: '[[1, 6], [8, 10], [15, 18]]' },
      { name: 'Touching', input: '1 4;4 5', expected: '[[1, 5]]' },
      { name: 'Contained', input: '1 10;2 3', expected: '[[1, 10]]', hidden: true }
    ]
  }
];

export function normalizeProblem(template: ProblemTemplate) {
  return {
    templateId: template.id,
    title: template.title,
    difficulty: template.difficulty,
    tags: template.tags,
    description: template.description,
    constraints: template.constraints,
    examples: template.examples,
    starterCode: template.starterCode
  };
}
