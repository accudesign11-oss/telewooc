import { useState } from "react";
import { PrompterToolbar } from "./PrompterToolbar";
import { PrompterChat } from "./PrompterChat";
import { PrompterPreview } from "./PrompterPreview";

export type SystemData = {
  domain: string;
  name: string;
  task: string;
  targetUser: string;
  inputs: string[];
  outputs: string[];
  commands: string[];
  rules: string[];
  identity: string[];
  status: "مسودة" | "مكتمل" | "مختبر";
};

export function PrompterWizard() {
  const [systemData, setSystemData] = useState<SystemData>({
    domain: "",
    name: "",
    task: "",
    targetUser: "",
    inputs: [],
    outputs: [],
    commands: [],
    rules: [],
    identity: [],
    status: "مسودة",
  });

  return (
    <div className="flex flex-col h-full gap-4">
      <PrompterToolbar />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Right Side: Chat */}
        <div className="md:col-span-8 flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
          <PrompterChat systemData={systemData} setSystemData={setSystemData} />
        </div>
        
        {/* Left Side: Preview */}
        <div className="md:col-span-4 flex flex-col h-full">
          <PrompterPreview data={systemData} />
        </div>
      </div>
    </div>
  );
}
