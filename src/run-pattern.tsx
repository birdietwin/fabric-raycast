import {
  List,
  ActionPanel,
  Action,
  Detail,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getPatterns, groupPatterns, Pattern } from "./utils/patterns";
import {
  detectInput,
  getSourceEmoji,
  getSourceDescription,
  InputResult,
} from "./utils/input";
import { runFabric } from "./utils/fabric";

const RECENT_PATTERNS_KEY = "recentPatterns";
const MAX_RECENT = 5;

export default function Command() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [recentPatterns, setRecentPatterns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [output, setOutput] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [inputInfo, setInputInfo] = useState<InputResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load patterns on mount
  useEffect(() => {
    try {
      const loadedPatterns = getPatterns();
      setPatterns(loadedPatterns);
    } catch (err) {
      setError(`Failed to load patterns: ${err}`);
    }
    setIsLoading(false);
  }, []);

  // Load recent patterns from storage
  useEffect(() => {
    LocalStorage.getItem<string>(RECENT_PATTERNS_KEY).then((stored) => {
      if (stored) {
        try {
          setRecentPatterns(JSON.parse(stored));
        } catch {
          // Ignore invalid stored data
        }
      }
    });
  }, []);

  const saveRecentPattern = useCallback(
    async (patternName: string) => {
      const updated = [
        patternName,
        ...recentPatterns.filter((p) => p !== patternName),
      ].slice(0, MAX_RECENT);
      setRecentPatterns(updated);
      await LocalStorage.setItem(RECENT_PATTERNS_KEY, JSON.stringify(updated));
    },
    [recentPatterns],
  );

  const executePattern = useCallback(
    async (pattern: Pattern) => {
      setIsLoading(true);
      setError(null);

      try {
        // Detect input source
        const input = await detectInput();
        setInputInfo(input);

        await showToast({
          style: Toast.Style.Animated,
          title: `Running ${pattern.displayName}`,
          message: `Processing ${getSourceDescription(input.source, input.metadata)}...`,
        });

        // Run fabric
        const result = await runFabric(
          pattern.name,
          input.content,
          input.source === "browser" && input.metadata?.url
            ? { scrapeUrl: input.metadata.url }
            : undefined,
        );

        setOutput(result);
        setSelectedPattern(pattern.name);
        await saveRecentPattern(pattern.name);

        await showToast({
          style: Toast.Style.Success,
          title: "Done!",
          message: `Processed with ${pattern.displayName}`,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMsg,
        });
      }

      setIsLoading(false);
    },
    [saveRecentPattern],
  );

  const goBack = useCallback(() => {
    setOutput(null);
    setSelectedPattern(null);
    setInputInfo(null);
    setError(null);
  }, []);

  // Show error if pattern loading failed
  if (error && !output) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={goBack} />
          </ActionPanel>
        }
      />
    );
  }

  // Show output view if we have results
  if (output && selectedPattern) {
    const sourceInfo = inputInfo
      ? `${getSourceEmoji(inputInfo.source)} ${getSourceDescription(inputInfo.source, inputInfo.metadata)}`
      : "Unknown";

    return (
      <Detail
        markdown={output}
        navigationTitle={selectedPattern.replace(/_/g, " ")}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Pattern"
              text={selectedPattern.replace(/_/g, " ")}
            />
            <Detail.Metadata.Label title="Input Source" text={sourceInfo} />
            {inputInfo?.metadata?.url && (
              <Detail.Metadata.Link
                title="URL"
                text={inputInfo.metadata.url}
                target={inputInfo.metadata.url}
              />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Output" content={output} />
            <Action
              title="Back to Patterns"
              icon={Icon.ArrowLeft}
              onAction={goBack}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={output}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Pattern selection list
  const grouped = groupPatterns(patterns);
  const recentPatternObjects = recentPatterns
    .map((name) => patterns.find((p) => p.name === name))
    .filter((p): p is Pattern => p !== undefined);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search patterns...">
      {/* Recent patterns section */}
      {recentPatternObjects.length > 0 && (
        <List.Section
          title="Recent"
          subtitle={`${recentPatternObjects.length} patterns`}
        >
          {recentPatternObjects.map((pattern) => (
            <PatternListItem
              key={`recent-${pattern.name}`}
              pattern={pattern}
              onExecute={executePattern}
              isRecent
            />
          ))}
        </List.Section>
      )}

      {/* Grouped patterns */}
      {Object.entries(grouped).map(([category, categoryPatterns]) => (
        <List.Section
          key={category}
          title={category.charAt(0).toUpperCase() + category.slice(1)}
          subtitle={`${categoryPatterns.length} patterns`}
        >
          {categoryPatterns.map((pattern) => (
            <PatternListItem
              key={pattern.name}
              pattern={pattern}
              onExecute={executePattern}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface PatternListItemProps {
  pattern: Pattern;
  onExecute: (pattern: Pattern) => void;
  isRecent?: boolean;
}

function PatternListItem({
  pattern,
  onExecute,
  isRecent,
}: PatternListItemProps) {
  const getCategoryIcon = (
    category: string,
  ): { source: Icon; tintColor: Color } => {
    const iconMap: Record<string, { source: Icon; tintColor: Color }> = {
      analyze: { source: Icon.MagnifyingGlass, tintColor: Color.Blue },
      create: { source: Icon.Plus, tintColor: Color.Green },
      extract: { source: Icon.Download, tintColor: Color.Orange },
      summarize: { source: Icon.Document, tintColor: Color.Purple },
      improve: { source: Icon.Wand, tintColor: Color.Yellow },
      find: { source: Icon.Eye, tintColor: Color.Magenta },
      rate: { source: Icon.Star, tintColor: Color.Red },
      suggest: { source: Icon.LightBulb, tintColor: Color.Green },
      compare: { source: Icon.Switch, tintColor: Color.Blue },
      explain: { source: Icon.QuestionMark, tintColor: Color.Purple },
      write: { source: Icon.Pencil, tintColor: Color.Orange },
    };

    return (
      iconMap[category] || {
        source: Icon.Circle,
        tintColor: Color.SecondaryText,
      }
    );
  };

  const icon = getCategoryIcon(pattern.category);

  return (
    <List.Item
      title={pattern.displayName}
      subtitle={pattern.name}
      icon={icon}
      accessories={
        isRecent ? [{ icon: Icon.Clock, tooltip: "Recently used" }] : []
      }
      keywords={[pattern.category, pattern.name, ...pattern.name.split("_")]}
      actions={
        <ActionPanel>
          <Action
            title="Run Pattern"
            icon={Icon.Play}
            onAction={() => onExecute(pattern)}
          />
          <Action.CopyToClipboard
            title="Copy Pattern Name"
            content={pattern.name}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
