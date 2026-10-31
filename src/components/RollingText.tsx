import { useState } from "react";

export type RollDirection = "up" | "down";

type RollingTextProps = {
    text: string;
    direction: RollDirection;
}

type Transition = {
    current: string;
    previous: string;
    direction: RollDirection;
    id: number;
}

// Pads the shorter string at the start, so characters line up from the right
// ("9:45 am" -> "10:00 am" keeps ":", "am" and the minutes in the same slots).
function alignRight(a: string[], b: string[]): [string[], string[]] {
    const length = Math.max(a.length, b.length);
    const pad = (chars: string[]) => [...Array(length - chars.length).fill(""), ...chars];
    return [pad(a), pad(b)];
}

export default function RollingText({ text, direction }: RollingTextProps) {
    const [transition, setTransition] = useState<Transition>({ current: text, previous: text, direction, id: 0 });

    // Record each text change during render, so the previous text is still known for the exit animation.
    if (transition.current !== text) {
        setTransition({ current: text, previous: transition.current, direction, id: transition.id + 1 });
    }

    const [previous, current] = alignRight(Array.from(transition.previous), Array.from(transition.current));

    return (
        <span className="rolling" aria-label={transition.current}>
            {current.map((char, index) => {
                const changed = transition.id > 0 && char !== previous[index];
                const slotKey = current.length - index;
                return (
                    <span key={slotKey} className="roll-slot" aria-hidden="true">
                        {changed && previous[index] && (
                            <span key={`${transition.id}-out`} className={`roll-out ${transition.direction}`}>
                                {previous[index] === " " ? " " : previous[index]}
                            </span>
                        )}
                        <span
                            key={`${changed ? transition.id : 0}-in`}
                            className={changed ? `roll-in ${transition.direction}` : undefined}
                        >
                            {char === " " ? " " : char}
                        </span>
                    </span>
                );
            })}
        </span>
    );
}
