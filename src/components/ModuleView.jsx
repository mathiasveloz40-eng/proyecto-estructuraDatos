import { moduleDetails } from "../dataStructures/Default";
import CrudPanel from "./CrudPanel";
import StructurePanel from "./StructurePanel";

export default function ModuleView({ module, data, service, refresh }) {
  const details = moduleDetails[module.id] || moduleDetails.array;
  return (
    <section className="module-view" aria-label={`Módulo ${module.label}`}>
      {module.id === "array" ? (
        <CrudPanel service={service} refresh={refresh} />
      ) : (
        <StructurePanel
          module={module}
          details={details}
          data={data}
          service={service}
          refresh={refresh}
        />
      )}
    </section>
  );
}