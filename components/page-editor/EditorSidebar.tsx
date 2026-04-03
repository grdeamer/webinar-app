"use client"

import EditorActionsCard from "@/components/page-editor/EditorActionsCard"
import SelectedEditorCard from "@/components/page-editor/SelectedEditorCard"
import SectionTemplatesCard from "@/components/page-editor/SectionTemplatesCard"
import AddElementCard from "@/components/page-editor/AddElementCard"
import SectionsListCard from "@/components/page-editor/SectionsListCard"

type Props = {
  isEditing: boolean
  isMobilePreview: boolean
  gridSize: number
  saveMessage: string | null
  onSaveTemplate: () => void
  onSave: () => void

  selectedElement: any
  selectedSection: any
  editorDetailsOpen: boolean
  setEditorDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>

  canDuplicateElement: boolean
  canDeleteElement: boolean
  canSendBackward: boolean
  canBringForward: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  canDuplicateSection: boolean
  canDeleteSection: boolean

  duplicateSelectedElement: () => void
  deleteSelectedElement: () => void
  sendSelectedElementBackward: () => void
  bringSelectedElementForward: () => void
  moveSelectedSection: (direction: "up" | "down") => void
  duplicateSelectedSection: () => void
  deleteSelectedSection: () => void
  updateElement: (id: string, patch: any) => void
  updateElementProps: (id: string, patch: Record<string, unknown>) => void
  updateSectionConfig: (id: string, patch: any) => void
  SectionPanelHeader: any
  registryItem: any

  sectionTemplatesOpen: boolean
  setSectionTemplatesOpen: React.Dispatch<React.SetStateAction<boolean>>
  addSectionPreset: (type: any) => void
  SECTION_TEMPLATE_OPTIONS: Array<{
    key: string
    title: string
    body: string
  }>

  addElementOpen: boolean
  setAddElementOpen: React.Dispatch<React.SetStateAction<boolean>>
  addElement: (type: any) => void

  sections: any[]
  sectionsListOpen: boolean
  setSectionsListOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectedSectionId: string | null
  draggingSectionId: string | null
  dragOverSectionId: string | null
  handleSectionDragStart: (sectionId: string) => void
  handleSectionDragOver: (e: React.DragEvent<HTMLButtonElement>, sectionId: string) => void
  handleSectionDrop: (sectionId: string) => void
  handleSectionDragEnd: () => void
  setSelectedSectionId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>
  setEditingElementId: React.Dispatch<React.SetStateAction<string | null>>
}

export default function EditorSidebar(props: Props) {
  const {
    isEditing,
    isMobilePreview,
    gridSize,
    saveMessage,
    onSaveTemplate,
    onSave,
  } = props

  return (
    <aside
      className={`border-l border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
        isEditing ? "w-[380px] opacity-100" : "w-0 overflow-hidden opacity-0"
      }`}
    >
      <div className="w-[380px] p-6">
        <EditorActionsCard
          isMobilePreview={isMobilePreview}
          gridSize={gridSize}
          saveMessage={saveMessage}
          onSaveTemplate={onSaveTemplate}
          onSave={onSave}
        />

        <SelectedEditorCard
          selectedElement={props.selectedElement}
          selectedSection={props.selectedSection}
          editorDetailsOpen={props.editorDetailsOpen}
          setEditorDetailsOpen={props.setEditorDetailsOpen}
          canDuplicateElement={props.canDuplicateElement}
          canDeleteElement={props.canDeleteElement}
          canSendBackward={props.canSendBackward}
          canBringForward={props.canBringForward}
          canMoveUp={props.canMoveUp}
          canMoveDown={props.canMoveDown}
          canDuplicateSection={props.canDuplicateSection}
          canDeleteSection={props.canDeleteSection}
          duplicateSelectedElement={props.duplicateSelectedElement}
          deleteSelectedElement={props.deleteSelectedElement}
          sendSelectedElementBackward={props.sendSelectedElementBackward}
          bringSelectedElementForward={props.bringSelectedElementForward}
          moveSelectedSection={props.moveSelectedSection}
          duplicateSelectedSection={props.duplicateSelectedSection}
          deleteSelectedSection={props.deleteSelectedSection}
          updateElement={props.updateElement}
          updateElementProps={props.updateElementProps}
          updateSectionConfig={props.updateSectionConfig}
          SectionPanelHeader={props.SectionPanelHeader}
          registryItem={props.registryItem}
        />

        <AddElementCard
          addElementOpen={props.addElementOpen}
          setAddElementOpen={props.setAddElementOpen}
          addElement={props.addElement}
          SectionPanelHeader={props.SectionPanelHeader}
        />

        <SectionTemplatesCard
          sectionTemplatesOpen={props.sectionTemplatesOpen}
          setSectionTemplatesOpen={props.setSectionTemplatesOpen}
          addSectionPreset={props.addSectionPreset}
          SectionPanelHeader={props.SectionPanelHeader}
          SECTION_TEMPLATE_OPTIONS={props.SECTION_TEMPLATE_OPTIONS}
        />

        <SectionsListCard
          sections={props.sections}
          sectionsListOpen={props.sectionsListOpen}
          setSectionsListOpen={props.setSectionsListOpen}
          selectedSectionId={props.selectedSectionId}
          draggingSectionId={props.draggingSectionId}
          dragOverSectionId={props.dragOverSectionId}
          handleSectionDragStart={props.handleSectionDragStart}
          handleSectionDragOver={props.handleSectionDragOver}
          handleSectionDrop={props.handleSectionDrop}
          handleSectionDragEnd={props.handleSectionDragEnd}
          setSelectedSectionId={props.setSelectedSectionId}
          setSelectedId={props.setSelectedId}
          setSelectedIds={props.setSelectedIds}
          setEditingElementId={props.setEditingElementId}
          SectionPanelHeader={props.SectionPanelHeader}
        />
      </div>
    </aside>
  )
}