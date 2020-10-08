cwlVersion: v1.0
class: CommandLineTool
$namespaces:
  cwltool: http://commonwl.org/cwltool#

requirements:
  cwltool:MPIRequirement:
    processes: $(inputs.nproc)

inputs:
  message:
    type: string
    inputBinding:
      position: 1
  nproc:
    type: int

baseCommand: echo


outputs: []
