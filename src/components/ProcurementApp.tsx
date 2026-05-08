"use client";
import React from "react";
import { useProcurement } from "@/context/ProcurementContext";
import { cn } from "@/lib/utils";

// Sub-components
import { ProcurementHeader } from "./procurement/ProcurementHeader";
import { ProcurementTabs } from "./procurement/ProcurementTabs";
import { Phase1Inputs } from "./procurement/Phase1Inputs";
import { Phase1Results } from "./procurement/Phase1Results";
import { VendorQuotes } from "./procurement/VendorQuotes";
import { Phase2Comparison } from "./procurement/Phase2Comparison";
import { Phase3Consolidation } from "./procurement/Phase3Consolidation";
import { AIInsights } from "./procurement/AIInsights";
import { OverallAIChat } from "./procurement/OverallAIChat";
import { SpecSummaryModal } from "./procurement/SpecSummaryModal";
import { ItemClarificationModal } from "./procurement/ItemClarificationModal";

export default function ProcurementApp() {
  const {
    NegotiationForm,
    activeTab,
    aggregatePhase3Data,
    aiEstimatedPrice,
    aiInsights,
    aiInsightsRef,
    alternatives,
    appRef,
    applicant,
    budgetAmount,
    chartData,
    confirmedItemDescription,
    confirmedItemRef,
    costBreakdown,
    costHistory,
    department,
    docNumber,
    expandedNegotiationItems,
    exportHistoryAsExcel,
    fetchAlternatives,
    fetchRecommendedVendors,
    handleAddSpec,
    handleAddVendor,
    handleClearAll,
    handleConsolidateSpecs,
    handleImportHistoryFile,
    handleOpenChat,
    handlePhase2ChatMessage,
    handleRemoveSpec,
    handleRemoveVendor,
    handleScreenshot,
    handleSectionScreenshot,
    handleSelectPhase2AnalysisItem,
    handleBatchGeneratePhase2Analysis,
    handleSendOverallChatMessage,
    handleSpecChange,
    handleStartItemClarification,
    handleTogglePhase3Merge,
    handleVendorChange,
    handleVendorQuotePdfSelected,
    handleEditPhase2Row,
    handleDeletePhase2Row,
    handlePhase2QuoteVersionChange,
    updateRowGrouping,
    handleConfirmSpecs,
    saveEditing,
    isItemModalOpen,
    setIsItemModalOpen,
    itemChatMessages,
    setItemChatMessages,
    itemChatInput,
    setItemChatInput,
    isItemChatLoading,
    handleSendItemChatMessage,
    proposedItemDescription,
    handler,
    handlingSection,
    historyFeedback,
    historyImportRef,
    isAnalyzing,
    isConsolidating,
    isFetchingAlternatives,
    isFetchingRecommendedVendors,
    isOverallChatLoading,
    isPhase2Aligning,
    isPhase2AnalysisLoading,
    isPhase2ChatLoading,
    isPhase2Negotiating,
    isPhase2Parsing,
    isSpecsConfirmed,
    itemName,
    overallChatInput,
    overallChatMessages,
    phase2,
    phase2ChatInput,
    phase2Error,
    phase3,
    projectName,
    quoteTimeframe,
    recommendedVendors,
    regenerateAllPhase3Justifications,
    regenerateNegotiationStrategy,
    runAiAnalysis,
    saveNegotiationRecord,
    section,
    selectedAnalysisItem,
    setActiveTab,
    setApplicant,
    setBudgetAmount,
    setConfirmedItemDescription,
    setDepartment,
    setDocNumber,
    setHandler,
    setHandlingSection,
    setItemName,
    setOverallChatInput,
    setPhase2ChatInput,
    setProjectName,
    setQuoteTimeframe,
    setSection,
    setShowAlternativesModal,
    setShowBreakdown,
    setShowDiffModal,
    setShowOverallChat,
    setShowProcurementInputs,
    setShowProjectDetails,
    setShowRecommendedVendorsModal,
    setShowSavedProjectsModal,
    setShowVendorSection,
    setSpecFile,
    setTotalQty,
    showAiInsights,
    setShowAiInsights,
    showBreakdown,
    showOverallChat,
    showProcurementInputs,
    showProjectDetails,
    showVendorSection,
    specFile,
    supplementarySpecs,
    toggleNegotiationForm,
    totalQty,
    vendorPdfInputRef,
    vendors,
    showSpecSummary,
    setShowSpecSummary,
    consolidatedSpecs,
    editingSpecIndex,
    setEditingSpecIndex,
    editingContent,
    setEditingContent,
  } = useProcurement();

  const [editingRowItem, setEditingRowItem] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<{ item: string; vendorQuote: number; aiEstimate: number } | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900" ref={appRef}>
      <div className="max-w-7xl mx-auto">
        <ProcurementHeader
          projectName={projectName}
          setProjectName={setProjectName}
          handleImportHistoryFile={handleImportHistoryFile}
          exportHistoryAsExcel={exportHistoryAsExcel}
          handleScreenshot={handleScreenshot}
          handleClearAll={handleClearAll}
          historyFeedback={historyFeedback}
          historyImportRef={historyImportRef}
        />

        <ProcurementTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Phase 1 Inputs */}
          {activeTab === 'phase1' && (
            <Phase1Inputs
              setShowSavedProjectsModal={setShowSavedProjectsModal}
              showProjectDetails={showProjectDetails}
              setShowProjectDetails={setShowProjectDetails}
              docNumber={docNumber}
              setDocNumber={setDocNumber}
              department={department}
              setDepartment={setDepartment}
              section={section}
              setSection={setSection}
              applicant={applicant}
              setApplicant={setApplicant}
              budgetAmount={budgetAmount}
              setBudgetAmount={setBudgetAmount}
              handlingSection={handlingSection}
              setHandlingSection={setHandlingSection}
              handler={handler}
              setHandler={setHandler}
              showProcurementInputs={showProcurementInputs}
              setShowProcurementInputs={setShowProcurementInputs}
              confirmedItemDescription={confirmedItemDescription}
              fetchAlternatives={fetchAlternatives}
              isFetchingAlternatives={isFetchingAlternatives}
              alternatives={alternatives}
              setShowAlternativesModal={setShowAlternativesModal}
              setSpecFile={setSpecFile}
              specFile={specFile}
              totalQty={totalQty}
              setTotalQty={setTotalQty}
              handleAddSpec={handleAddSpec}
              supplementarySpecs={supplementarySpecs}
              handleSpecChange={handleSpecChange}
              handleRemoveSpec={handleRemoveSpec}
              quoteTimeframe={quoteTimeframe}
              setQuoteTimeframe={setQuoteTimeframe}
              handleConsolidateSpecs={handleConsolidateSpecs}
              isConsolidating={isConsolidating}
              isSpecsConfirmed={isSpecsConfirmed}
              itemName={itemName}
              setItemName={setItemName}
              handleStartItemClarification={handleStartItemClarification}
              confirmedItemRef={confirmedItemRef}
              handleSectionScreenshot={handleSectionScreenshot}
              setConfirmedItemDescription={setConfirmedItemDescription}
              runAiAnalysis={runAiAnalysis}
              isAnalyzing={isAnalyzing}
            />
          )}

          {/* Main Content Area */}
          <div className={cn('space-y-8', activeTab === 'phase1' ? 'lg:col-span-8' : 'lg:col-span-12')}>
            {activeTab === 'phase1' && (
              <>
                <Phase1Results
                  aiEstimatedPrice={aiEstimatedPrice}
                  totalQty={totalQty}
                  quoteTimeframe={quoteTimeframe}
                  runAiAnalysis={runAiAnalysis}
                  isAnalyzing={isAnalyzing}
                  setShowDiffModal={setShowDiffModal}
                  costHistory={costHistory}
                  showBreakdown={showBreakdown}
                  setShowBreakdown={setShowBreakdown}
                  costBreakdown={costBreakdown}
                  handleOpenChat={handleOpenChat}
                />
                
                <VendorQuotes
                  confirmedItemDescription={confirmedItemDescription}
                  fetchRecommendedVendors={fetchRecommendedVendors}
                  isFetchingRecommendedVendors={isFetchingRecommendedVendors}
                  recommendedVendors={recommendedVendors}
                  setShowRecommendedVendorsModal={setShowRecommendedVendorsModal}
                  handleAddVendor={handleAddVendor}
                  showVendorSection={showVendorSection}
                  setShowVendorSection={setShowVendorSection}
                  vendors={vendors}
                  handleVendorChange={handleVendorChange}
                  handleRemoveVendor={handleRemoveVendor}
                  chartData={chartData}
                />

                <AIInsights
                  showAiInsights={showAiInsights}
                  setShowAiInsights={setShowAiInsights}
                  aiInsights={aiInsights}
                  handleSectionScreenshot={handleSectionScreenshot}
                  aiInsightsRef={aiInsightsRef}
                  isAnalyzing={isAnalyzing}
                />

                <OverallAIChat
                  showOverallChat={showOverallChat}
                  setShowOverallChat={setShowOverallChat}
                  overallChatMessages={overallChatMessages}
                  isOverallChatLoading={isOverallChatLoading}
                  overallChatInput={overallChatInput}
                  setOverallChatInput={setOverallChatInput}
                  handleSendOverallChatMessage={handleSendOverallChatMessage}
                />
              </>
            )}

            {activeTab === 'phase2' && (
              <Phase2Comparison
                aiEstimatedPrice={aiEstimatedPrice}
                totalQty={totalQty}
                isPhase2Parsing={isPhase2Parsing}
                isPhase2Aligning={isPhase2Aligning}
                isPhase2Negotiating={isPhase2Negotiating}
                vendorPdfInputRef={vendorPdfInputRef}
                handleVendorQuotePdfSelected={handleVendorQuotePdfSelected}
                phase2Error={phase2Error}
                phase2={phase2}
                handleBatchGeneratePhase2Analysis={handleBatchGeneratePhase2Analysis}
                isPhase2AnalysisLoading={isPhase2AnalysisLoading}
                handleSelectPhase2AnalysisItem={handleSelectPhase2AnalysisItem}
                selectedAnalysisItem={selectedAnalysisItem}
                updateRowGrouping={updateRowGrouping}
                toggleNegotiationForm={toggleNegotiationForm}
                expandedNegotiationItems={expandedNegotiationItems}
                handleEditPhase2Row={handleEditPhase2Row}
                handleDeletePhase2Row={handleDeletePhase2Row}
                handlePhase2QuoteVersionChange={handlePhase2QuoteVersionChange}
                saveNegotiationRecord={saveNegotiationRecord}
                regenerateNegotiationStrategy={regenerateNegotiationStrategy}
                phase2ChatInput={phase2ChatInput}
                setPhase2ChatInput={setPhase2ChatInput}
                handlePhase2ChatMessage={handlePhase2ChatMessage}
                isPhase2ChatLoading={isPhase2ChatLoading}
                NegotiationForm={NegotiationForm}
              />
            )}

            {activeTab === 'phase3' && (
              <Phase3Consolidation
                phase3={phase3}
                handleTogglePhase3Merge={handleTogglePhase3Merge}
                regenerateAllPhase3Justifications={regenerateAllPhase3Justifications}
                phase2={phase2}
                budgetAmount={budgetAmount}
                aggregatePhase3Data={aggregatePhase3Data}
              />
            )}
          </div>
        </div>
      </div>

      <SpecSummaryModal
        isOpen={showSpecSummary}
        onClose={() => setShowSpecSummary(false)}
        specs={consolidatedSpecs}
        onConfirm={handleConfirmSpecs}
        isConsolidating={isConsolidating}
        editingIndex={editingSpecIndex}
        setEditingIndex={setEditingSpecIndex}
        editingContent={editingContent}
        setEditingContent={setEditingContent}
        saveEditing={saveEditing}
      />

      <ItemClarificationModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        messages={itemChatMessages}
        onSendMessage={handleSendItemChatMessage}
        input={itemChatInput}
        setInput={setItemChatInput}
        isLoading={isItemChatLoading}
        proposedDescription={proposedItemDescription}
        confirmedDescription={confirmedItemDescription}
        setConfirmedDescription={setConfirmedItemDescription}
      />
    </div>
  );
}
