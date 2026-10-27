import { SlashCommandDefinition } from '@shared/types';
import { parseNaturalTime } from './timeParser';

export const AVAILABLE_COMMANDS: SlashCommandDefinition[] = [
  {
    command: '/poll',
    syntax: '/poll <Question> | <Option 1> | <Option 2> [| Option 3]',
    description: 'Create an interactive realtime poll in this chat',
    example: '/poll Favorite drink? | Coffee | Tea | Matcha',
  },
  {
    command: '/remind',
    syntax: '/remind <10m|1h|tomorrow 9am> <Message>',
    description: 'Schedule an automated reminder notification',
    example: '/remind 30m Check on production deployment',
  },
  {
    command: '/announce',
    syntax: '/announce <Announcement message>',
    description: 'Post a prominent bold announcement',
    example: '/announce Please review the updated architecture spec',
  },
  {
    command: '/help',
    syntax: '/help',
    description: 'View list of all available commands and keyboard shortcuts',
    example: '/help',
  },
];

export interface ParsedCommand {
  command: string;
  rawText: string;
  error?: string;
  data?: {
    // For /poll
    question?: string;
    options?: string[];
    // For /remind
    timeStr?: string;
    remindAt?: Date;
    reminderText?: string;
    // For /announce or /help
    announcementText?: string;
  };
}

export function parseSlashCommand(input: string): ParsedCommand | null {
  if (!input || !input.trim().startsWith('/')) {
    return null;
  }

  const trimmed = input.trim();
  const spaceIndex = trimmed.indexOf(' ');
  const command = (spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)).toLowerCase();
  const args = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();

  switch (command) {
    case '/help':
      return {
        command: '/help',
        rawText: trimmed,
        data: {},
      };

    case '/poll': {
      if (!args) {
        return {
          command: '/poll',
          rawText: trimmed,
          error: 'Syntax: /poll <Question> | <Option 1> | <Option 2>',
        };
      }

      const parts = args.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length < 3) {
        return {
          command: '/poll',
          rawText: trimmed,
          error: 'A poll requires a question and at least 2 options separated by |',
        };
      }

      const question = parts[0];
      const options = parts.slice(1);

      if (options.length > 12) {
        return {
          command: '/poll',
          rawText: trimmed,
          error: 'A poll cannot have more than 12 options',
        };
      }

      return {
        command: '/poll',
        rawText: trimmed,
        data: {
          question,
          options,
        },
      };
    }

    case '/remind': {
      if (!args) {
        return {
          command: '/remind',
          rawText: trimmed,
          error: 'Syntax: /remind <time> <message> (e.g. /remind 15m Call client)',
        };
      }

      // First check single word time: "10m", "2h", "1d"
      let timePart = '';
      let textPart = '';

      const firstSpace = args.indexOf(' ');
      if (firstSpace === -1) {
        return {
          command: '/remind',
          rawText: trimmed,
          error: 'Please include the reminder message text after the time.',
        };
      }

      // Check if multi-word time e.g. "tomorrow at 9am" or "tomorrow 9am"
      if (args.toLowerCase().startsWith('tomorrow')) {
        const match = args.match(/^tomorrow(?:\s+at)?\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i);
        if (match) {
          timePart = match[0];
          textPart = args.slice(timePart.length).trim();
        } else {
          timePart = args.slice(0, firstSpace);
          textPart = args.slice(firstSpace + 1).trim();
        }
      } else {
        timePart = args.slice(0, firstSpace);
        textPart = args.slice(firstSpace + 1).trim();
      }

      const remindAt = parseNaturalTime(timePart);
      if (!remindAt) {
        return {
          command: '/remind',
          rawText: trimmed,
          error: `Unrecognized time "${timePart}". Use formats like 10m, 1h, 1d, or "tomorrow 9am".`,
        };
      }

      if (!textPart) {
        return {
          command: '/remind',
          rawText: trimmed,
          error: 'Please specify the reminder text (e.g. /remind 10m Check oven)',
        };
      }

      return {
        command: '/remind',
        rawText: trimmed,
        data: {
          timeStr: timePart,
          remindAt,
          reminderText: textPart,
        },
      };
    }

    case '/announce': {
      if (!args) {
        return {
          command: '/announce',
          rawText: trimmed,
          error: 'Syntax: /announce <Announcement message>',
        };
      }

      return {
        command: '/announce',
        rawText: trimmed,
        data: {
          announcementText: args,
        },
      };
    }

    default:
      return {
        command,
        rawText: trimmed,
        error: `Unknown slash command "${command}". Type /help for available commands.`,
      };
  }
}
