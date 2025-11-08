module.exports = {
  parserPreset: {
    parserOpts: {
      // Adjust the headerPattern to match the required pattern
      headerPattern: /^(\w+)-(\w+\/\w+)\s*:\s*(.+)$/,
      headerCorrespondence: ['prefix', 'taskId', 'subject']
    }
  },
  rules: {
    'commit-msg-validator': [2, 'always'] // Enforce commit-msg-validator rule as an error
  },
  plugins: [
    {
      rules: {
        'commit-msg-validator': (parsed) => {
          const { prefix, taskId, subject } = parsed
          const minSubjectLength = 5

          if (!prefix || !taskId || !subject) {
            return [false, 'Commit message must follow the pattern "PREFIX-TASKID/ALLOWED_KEYWORDS: Subject"']
          }

          const validPrefixes = ['HPPD'] // Array of valid prefixes
          const minTaskIdLength = 1 // Minimum length of numeric task ID
          const maxTaskIdLength = 5 // Maximum length of numeric task ID
          const validKeywords = ['FIX', 'MERGE', 'FEAT', 'HOTFIX'] // Allowed keywords for task ID

          // Check if prefix is valid
          if (!validPrefixes.includes(prefix)) {
            return [
              false,
              validPrefixes.length === 1
                ? `Commit message must start with: ${validPrefixes[0]}`
                : `Commit message must start with one of the following: ${validPrefixes.join(', ')}`
            ]
          }

          // Split taskId into numeric part and keyword part
          const [numericTaskId, keyword] = taskId.split('/')

          const isNumericTaskId = /^\d+$/.test(numericTaskId)
          const isValidKeyword = validKeywords.includes(keyword.toUpperCase())

          if (!(isNumericTaskId && numericTaskId.length >= minTaskIdLength && numericTaskId.length <= maxTaskIdLength && +numericTaskId !== 0 && isValidKeyword)) {
            return [
              false,
              `task-id must be a valid number between ${minTaskIdLength} and ${maxTaskIdLength} characters long followed by a valid keyword listed: (${validKeywords.join(', ')}) separated by a slash\n\nExample: HPPD-123/FIX: Fixed a bug`
            ]
          }

          // Check if subject length excluding spaces meets the minimum length requirement
          const subjectWithoutSpaces = subject.replace(/\s+/g, '')
          if (subjectWithoutSpaces.length < minSubjectLength) {
            return [false, `The subject must be at least ${minSubjectLength} characters long excluding spaces.\n\nExample: HPPD-123/FIX: Fixed a bug`]
          }

          // Check if the subject is purely numeric
          const isSubjectPurelyNumeric = /^\d+$/.test(subjectWithoutSpaces)
          if (isSubjectPurelyNumeric) {
            return [false, `The subject must not be purely numeric.\n\nExample: HPPD-123/FIX: Fixed a bug`]
          }

          return [true]
        }
      }
    }
  ]
}
