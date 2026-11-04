import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class ReferenceEditorSurvey extends GhidraScript {
 public void run() throws Exception {
  PrintWriter out=new PrintWriter(new FileWriter(getScriptArgs()[0]));
  String[] needles={"editor_sym_snap","editor_sym_unsnap","symmetricIndex","BuildingEditor","BuildingHouse","SnapDistanceZoomFactor","Skinner/PaintSystem","partsPaintEnv","Simulator/cMorphHandle","Simulator/cTargetMorphHandle","Simulator/cArrowMorphHandle","paintMask"};
  Set<Function> functions=new LinkedHashSet<>();
  out.println("Program: "+currentProgram.getName()+" | image base "+currentProgram.getImageBase());
  out.println("Functions recognized: "+currentProgram.getFunctionManager().getFunctionCount());
  for(String needle:needles){
   byte[] bytes=(needle+"\0").getBytes(StandardCharsets.US_ASCII);
   Address cursor=currentProgram.getMinAddress();
   while(cursor!=null){Address found=currentProgram.getMemory().findBytes(cursor,bytes,null,true,monitor);if(found==null)break;
    out.println("\nSTRING "+needle+" @ "+found);
    for(Reference ref:getReferencesTo(found)){
     Function f=getFunctionContaining(ref.getFromAddress());
     out.println("  REF "+ref.getFromAddress()+" "+ref.getReferenceType()+" function="+(f==null?"none":f.getName()+" @ "+f.getEntryPoint()));
     if(f!=null)functions.add(f);
     out.println("    "+getInstructionAt(ref.getFromAddress()));
    }
    cursor=found.add(bytes.length);
   }
  }
  DecompInterface decomp=new DecompInterface();decomp.openProgram(currentProgram);
  for(Function f:functions){if(monitor.isCancelled())break;
   out.println("\n=== FUNCTION "+f.getName()+" @ "+f.getEntryPoint()+" size="+f.getBody().getNumAddresses()+" ===");
   out.println("CALLERS:");for(Reference r:getReferencesTo(f.getEntryPoint())){Function caller=getFunctionContaining(r.getFromAddress());out.println(r.getFromAddress()+" "+(caller==null?"data":caller.getName()+" @ "+caller.getEntryPoint()));}
   DecompileResults result=decomp.decompileFunction(f,30,monitor);
   if(result.decompileCompleted())out.println(result.getDecompiledFunction().getC());else out.println("DECOMPILE FAILED "+result.getErrorMessage());
   out.flush();
  }
  decomp.dispose();out.close();
 }
}
